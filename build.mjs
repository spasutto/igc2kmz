import * as esbuild from 'esbuild'
//import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';
import * as fs from 'fs';

//const path = require('path')

var config = {
  loader: {
    '.png': 'dataurl',
    '.ttf': 'dataurl'
  },
  bundle: true,
  //outdir: path.join(process.cwd(), "dist"),
  absWorkingDir: process.cwd(),
  keepNames: true,
  //watch: process.argv.includes("--watch"),
};

let buildmode = process.argv.length > 2 ? process.argv[2] : 'default';
let bundle = process.argv.length > 3 && process.argv[3] == 'bundle';
switch (buildmode) {
  case 'cmd':
    config = {
      entryPoints: ["igc2kmz/cmdwrapper.ts"],
      outfile: 'dist/igc2kmz.cmd.js',
      platform: 'node',
      ...config,
    }
    break;
  case 'minify':
    config = {
      outfile: 'dist/igc2kmz.min.js',
      minify: true,
      ...config,
    }
  default:
  case 'web':
    config = {
      outfile: 'dist/igc2kmz.js',
      entryPoints: ["igc2kmz/webwrapper.ts"],
      //plugins: [inlineWorkerPlugin(extraconfig)]
      ...config,
    }
    break;
}

await esbuild.build({
  ...config,
}).catch(() => process.exit(1));

if (bundle) {
  // BUNDLE
  const reginsert = /<script[\s\r\n]+src\s*=\s*(?:"|')([^"']+)(?:"|')[\s\r\n]*>/i;
  const regminifyjs = /<script>((?:.|[\r\n])*)<\/script>/i;
  const regminifycss = /<style>((?:.|[\r\n])*)<\/style>/i;
  let htmli2k = fs.readFileSync('./igc2kmz.html', { encoding: 'utf8', flag: 'r' });
  let matches = null;
  let count = 0;
  while ((matches = htmli2k.match(regminifyjs)) != null && count++ < 10) {
    if (matches.length < 2) continue;
    const minifiedjs = await esbuild.transform(matches[1], { loader: 'js', minify: true });
    if (typeof minifiedjs.code === 'string') {
      //https://stackoverflow.com/a/34040529
      //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement
      htmli2k = htmli2k.replace(regminifyjs, () => ('<script>' + minifiedjs.code + '</script>'));
    }
  }
  count = 0;
  while ((matches = htmli2k.match(regminifycss)) != null && count++ < 10) {
    if (matches.length < 2) continue;
    const minifiedjs = await esbuild.transform(matches[1], { loader: 'css', minify: true });
    if (typeof minifiedjs.code === 'string') {
      //https://stackoverflow.com/a/34040529
      //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement
      htmli2k = htmli2k.replace(regminifycss, () => ('<style>' + minifiedjs.code + '</style>'));
    }
  }
  if (!reginsert.test(htmli2k)) {
    throw new Error('Unable to find igc2kmz script tag in HTML!!!');
  } else {
    count = 0;
    while ((matches = htmli2k.match(reginsert)) != null && count++ < 10) {
      if (matches.length < 2) continue;
      const minifiedjs = fs.readFileSync(matches[1], { encoding: 'utf8', flag: 'r' });
      //https://stackoverflow.com/a/34040529
      //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement
      htmli2k = htmli2k.replace(reginsert, () => ('<script>' + minifiedjs));
    }
  }
  fs.writeFileSync('./dist/igc2kmz_spa.html', htmli2k);
}
