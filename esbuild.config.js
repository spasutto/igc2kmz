const path = require('path')

require("esbuild").build({
  entryPoints: ["igc2kmz/webwrapper.ts"],
  bundle: true,
  absWorkingDir: process.cwd(),
  //outdir: path.join(process.cwd(), "dist"),
  outfile: 'dist/igc2kmz.js',
  //watch: process.argv.includes("--watch"),
  loader: {
    '.png': 'dataurl'
  },
}).catch(() => process.exit(1))
