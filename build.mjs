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
  const regtoreplace = /<script[\s\r\n]+src\s*=\s*(?:"|')([^"']+)(?:"|')[\s\r\n]*>/i;
  let htmli2k = fs.readFileSync('./igc2kmz.html', { encoding: 'utf8', flag: 'r' });
  let matches = null;
  if (!regtoreplace.test(htmli2k)) {
    throw new Error('Unable to find igc2kmz script tag in HTML!!!');
  } else {
    let count = 0;
    while ((matches = htmli2k.match(regtoreplace)) != null && count++ < 10) {
      if (matches.length < 2) continue;
      const minifiedjs = fs.readFileSync(matches[1], { encoding: 'utf8', flag: 'r' });
      //https://stackoverflow.com/a/34040529
      //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement
      htmli2k = htmli2k.replace(regtoreplace, () => ('<script>' + minifiedjs));
    }
  }
  fs.writeFileSync('./dist/igc2kmz_spa.html', htmli2k);
}
