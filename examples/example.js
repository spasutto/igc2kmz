
// node --inspect-brk example/example.js

if (process.argv.length < 3) {
  console.log('Usage: node ' + process.argv[1] + ' FILENAME.IGC');
  process.exit(1);
}
var igc2kmz = require('../dist/igc2kmz');
var fs = require('fs')
  , filename = process.argv[2];
fs.readFile(filename, 'utf8', function(err, data) {
  if (err) throw err;
  igc2kmz.igc2kmz(data);
});

