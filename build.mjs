import * as esbuild from 'esbuild'
//import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';
import * as fs from 'fs';
import { simpleGit } from 'simple-git';
import JSZip from 'jszip';

//const path = require('path')

var version = '?.?.?';
var usegit = true;

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
function getLastVersion() {
  console.log(`Getting tags...`);
  return new Promise(res => {
    simpleGit().tags().then(tags => {
      usegit = tags && typeof tags.latest === 'string';
      let latesttag = usegit ? tags.latest : fs.readFileSync("VERSION", { encoding: 'utf8', flag: 'r' });
      const regversion = /v(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?/i;
      let matches = null;
      if (!(matches = latesttag.match(regversion)) || matches.length < 4) throw new Error('No valid version found');
      let v = { 'major': parseInt(matches[1]), 'minor': parseInt(matches[2]), 'revision': parseInt(matches[3]) };
      if (matches.length > 4) v.build = parseInt(matches[4]);
      res(v);
    });
  });
}

function buildRelease() {
  console.log(`Releasing '${version}.'...`);
  let zipname = `igc2kmz-${version}.zip`;
  let zip = new JSZip();
  ['igc2kmz.cmd.js', 'igc2kmz.min.js', 'igc2kmz.js'].forEach(f => zip.file('dist/' + f, fs.readFileSync('dist/' + f, { encoding: 'utf8', flag: 'r' })));
  ['igc2kmz.html', 'README.md', 'LICENSE', 'sw.js', 'igc2kmz.webmanifest', 'favicon.ico', 'assets/googleearth-32.png', 'assets/googleearth-64.png', 'assets/googleearth-128.png', 'assets/googleearth-256.png', 'assets/googleearth-512.png'].forEach(f => zip.file(f, fs.readFileSync(f, { encoding: 'utf8', flag: 'r' })));
  zip.file('igc2kmz_spa.html', fs.readFileSync('dist/igc2kmz_spa.html', { encoding: 'utf8', flag: 'r' }));
  zip
    .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(zipname))
    .on('finish', function () {
      console.log(zipname + " written.");
    });
}

async function buildAction(buildmode) {
  let build = true, bundle = false, release = false;
  let config = {};

  switch (buildmode) {
    case 'newminorversion':
    case 'newversion':
      // don't do anything on version upgrade (build already done)
      release = false;
      build = false;
      bundle = false;
      break;
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
        entryPoints: ["igc2kmz/cli.ts"],
        outfile: 'dist/igc2kmz.cmd.js',
        platform: 'node',
        ...defaultconfig,
      }
      break;
    case 'node':
      config = {
        entryPoints: ["igc2kmz/nodewrapper.ts"],
        outfile: 'dist/igc2kmz.js',
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

  let replacements = {
    '__IGC2KMZ_VERSION__': `${version}`,
    '__IGC2KMZ_BUILDDATE__': Date.now().toString()
  };

  if (build) {
    console.log(`Building '${buildmode}'...`);
    await esbuild.build(config).catch(() => process.exit(1));
    // version web : contournement de l'utilisation de l'objet global dans collections.js utilisée par igc-xc-score ;
    // dans le fichier generic-collections.js est référencé directement l'objet global. Fonctionne avec webpack
    let builtjs = fs.readFileSync(config.outfile, { encoding: 'utf8', flag: 'r' });
    if (!['cmd', 'node'].includes(buildmode)) {
      const usestrict = '"use strict";';
      let startofjs = builtjs.indexOf(usestrict);
      if (startofjs > -1) {
        builtjs = usestrict + 'window.global=window;' + builtjs.substring(startofjs + usestrict.length);
      }
    }
    for (let repkey in replacements) {
      builtjs = builtjs.replaceAll(repkey, replacements[repkey]);
    }
    fs.writeFileSync(config.outfile, builtjs);
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
    htmli2k = htmli2k.replace(/useSW\s*=\s*true/g, 'useSW = false').replaceAll(/<link\s+[^>]+>/gi, '');
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

function distinct(value, index, array) {
  return array.indexOf(value) === index;
}

var allargs = ['cmd', 'web', 'minify', 'bundle'];
var argv = process.argv.slice(2).map(v => v.trim().toLowerCase());
if (argv.length <= 0) {
  argv = allargs;
}
var newversion = false;
var minor = false;
var release = false;
if (argv.includes('release')) {
  release = true;
  argv = [...allargs, ...argv];
}
if (argv.includes('newminorversion')) {
  newversion = true;
  minor = true;
  argv = [...allargs, ...argv];
}
if (argv.includes('newversion')) {
  newversion = true;
  argv = [...allargs, ...argv];
}
if (release) argv.push('release');
argv = argv.filter(distinct);
getLastVersion().then(async v => {
  if (newversion) {
    if (minor) {
      v.build = v.build ?? 0;
      v.build++;
    } else {
      v.build = null;
      v.revision++;
    }
  }
  version = `${v.major}.${v.minor}.${v.revision}`;
  if (v.build) {
    version += `.${v.build}`;
  }
  argv.forEach(await buildAction);
  if (newversion) {
    fs.writeFileSync('VERSION', 'v' + version);
    //sw.js
    let filetomod = fs.readFileSync('sw.js', { encoding: 'utf8', flag: 'r' });
    let regversion = /(currentVersion\s*=\s*)'(v\d+\.\d+\.\d+(?:\.\d+)?)'/gi;
    fs.writeFileSync('sw.js', filetomod.replace(regversion, `$1'v${version}'`));
    //package.json
    filetomod = fs.readFileSync('package.json', { encoding: 'utf8', flag: 'r' });
    regversion = /("version"\s*:\s*)"(\d+\.\d+\.\d+(?:\.\d+)?)"'/gi;
    fs.writeFileSync('package.json', filetomod.replace(regversion, `$1"${version}"`));
    // commit changes
    if (usegit) {
      simpleGit().commit('Version : ' + version, ['VERSION', 'sw.js', 'package.json']).then(cr => {
        simpleGit().addTag('v' + version).then(tag => {
          console.log(`tag '${tag.name}' created.`);
        });
      });
    }
  }
});
