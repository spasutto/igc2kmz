import * as esbuild from 'esbuild'
//import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';
import * as fs from 'fs';
import { simpleGit, CleanOptions } from 'simple-git';
import JSZip from 'jszip';

//const path = require('path')

var defaultconfig = {
  loader: {
    '.png': 'dataurl',
    '.ttf': 'dataurl',
  },
  bundle: true,
  //outdir: path.join(process.cwd(), "dist"),
  absWorkingDir: process.cwd(),
  keepNames: true,
  //watch: process.argv.includes("--watch"),
};

function buildRelease() {
  simpleGit().tags().then(res => {
    const regversion = /v(\d+\.\d+\.\d+)/i;
    let matches = null;
    if (!res || !(matches = res.latest.match(regversion)) || matches.length < 2) throw new Error('No valid version found');
    console.log(`Releasing '${matches[1]}'...`);
    let zipname = `igc2kmz-${matches[1]}.zip`;
    let zip = new JSZip();
    ['igc2kmz.cmd.js', 'igc2kmz.min.js', 'igc2kmz.js'].forEach(f => zip.file('dist/' + f, fs.readFileSync('dist/' + f, { encoding: 'utf8', flag: 'r' })));
    zip.file('igc2kmz_spa.html', fs.readFileSync('dist/igc2kmz_spa.html', { encoding: 'utf8', flag: 'r' }));
    ['igc2kmz.html', 'README.md', 'LICENSE'].forEach(f => zip.file(f, fs.readFileSync(f, { encoding: 'utf8', flag: 'r' })));
    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(fs.createWriteStream(zipname))
      .on('finish', function () {
        console.log(zipname + " written.");
      });
  });
}

async function buildAction(buildmode) {
  let build = true, bundle = false, release = false;
  let config = {};

  switch (buildmode) {
    case 'release':
      release = true;
      build = false;
      bundle = false;
      break;
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
    console.log(`Building '${buildmode}'...`);
    await esbuild.build(config).catch(() => process.exit(1));
    // contournement d'un bug dans collections.js utilisée par igc-xc-score ;
    // dans le fichier generic-collections.js est référencé directement l'objet global
    if (buildmode != 'cmd') {
      let builtjs = fs.readFileSync(config.outfile, { encoding: 'utf8', flag: 'r' });
      const usestrict = '"use strict";';
      let startofjs = builtjs.indexOf(usestrict);
      if (startofjs > -1) {
        builtjs = usestrict + 'window.global=window;' + builtjs.substring(startofjs + usestrict.length);
        fs.writeFileSync(config.outfile, builtjs);
      }
    }
  }
  if (bundle) {
    console.log(`Bundling igc2html_spa.html...`);
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
  if (release) {
    buildRelease();
  }
}

let allargs = ['cmd', 'web', 'minify', 'bundle'];
let argv = process.argv.slice(2).map(v => v.trim().toLowerCase());
if (argv.length <= 0) {
  argv = allargs;
} else if (argv.indexOf('release') > -1) {
  argv = [...allargs, 'release'];
}
argv.forEach(await buildAction);
