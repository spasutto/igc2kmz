import * as esbuild from 'esbuild'
//import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';
import * as fs from 'fs';

//const path = require('path')

var defaultconfig = {
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

async function buildAction(buildmode) {
  console.log(`Building '${buildmode}'...`);
  let build = true, bundle = false;
  let config = {};

  switch (buildmode) {
    case 'bundle':
      build = false;
      bundle = true;
      break;
    case 'cmd':
      config = {
        entryPoints: ["igc2kmz/cmdwrapper.ts"],
        outfile: 'dist/igc2kmz.cmd.js',
        platform: 'node',
        ...defaultconfig,
      }
      break;
    case 'minify':
      config = {
        outfile: 'dist/igc2kmz.min.js',
        entryPoints: ["igc2kmz/webwrapper.ts"],
        minify: true,
        ...defaultconfig,
      }
      break;
    case 'web':
      config = {
        outfile: 'dist/igc2kmz.js',
        entryPoints: ["igc2kmz/webwrapper.ts"],
        //plugins: [inlineWorkerPlugin(extraconfig)]
        ...defaultconfig,
      }
      break;
    default:
      throw new Error(`unknow action '${buildmode}'`);
  }

  if (build) {
    await esbuild.build(config).catch(() => process.exit(1));
  }
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
}

let argv = process.argv.slice(2);
if (argv.length <= 0) argv.push('cmd', 'web', 'minify', 'bundle');
argv.forEach(await buildAction);
