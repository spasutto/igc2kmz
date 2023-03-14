import * as esbuild from 'esbuild'
//import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';

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
}).catch(() => process.exit(1))
