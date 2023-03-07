import * as esbuild from 'esbuild'
//import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';

//const path = require('path')

import extraconfig from './esbuild.config.mjs';

await esbuild.build({
  entryPoints: ["igc2kmz/webwrapper.ts"],
  bundle: true,
  absWorkingDir: process.cwd(),
  //outdir: path.join(process.cwd(), "dist"),
  outfile: 'dist/igc2kmz.min.js',
  //watch: process.argv.includes("--watch"),
  ...extraconfig,
  minify: true,
  //plugins: [inlineWorkerPlugin(extraconfig)]
}).catch(() => process.exit(1))
