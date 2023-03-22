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

let build = true;
let buildmode = process.argv.length > 2 ? process.argv[2] : 'default';
switch (buildmode) {
  case 'bundleweb':
    build = false;
    break;
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

if (build) {
  await esbuild.build({
    ...config,
  }).catch(() => process.exit(1))
} else {
  // BUNDLE
  const regtoreplace = /<script[\s\r\n]+src=(?:"|')\.\/dist\/igc2kmz\.min\.js(?:"|')[\s\r\n]*>/i; //'<script src="./dist/igc2kmz.min.js">';
  let htmli2k = fs.readFileSync('./igc2kmz.html', { encoding: 'utf8', flag: 'r' });
  const minifiedjs = fs.readFileSync('./dist/igc2kmz.min.js', { encoding: 'utf8', flag: 'r' });
  if (!regtoreplace.test(htmli2k)) {
    throw new Error('Unable to find igc2kmz script tag in HTML!!!');
  } else {
    //https://stackoverflow.com/a/34040529
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement
    htmli2k = htmli2k.replace(regtoreplace, () => ('<script>' + minifiedjs));
    fs.writeFileSync('./dist/igc2kmz_spa.html', htmli2k);
  }
}