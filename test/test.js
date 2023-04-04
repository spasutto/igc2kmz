var assert = require('assert');
var fs = require('fs');
var JSZip = require("jszip");
var igc2kmz = require('../dist/igc2kmz.js');
var x = require('libxmljs');

function file_exists_in_zip(zip, filename) {
  return new Promise((res, rej) => {
    let filetocheck = zip.file(filename);
    if (!filetocheck) res({ 'valid': false, 'filename': filename });
    else filetocheck.async("string").then(data => res({ 'valid': data.length > 0, 'filename': filename })).catch(rej);
  })
}

describe('Simple structure test', function () {
  this.timeout(25000);
  it('should have necessary files inside KMZ', function (done) {
    let igccontent = fs.readFileSync('examples/flight.igc', { encoding: 'utf8', flag: 'r' });
    igc2kmz.igc2kmz(igccontent).catch(err => assert.fail(err)).then(kmz => {
      JSZip.loadAsync(kmz).then(zip => {
        Promise.all([file_exists_in_zip(zip, "doc.kml"), file_exists_in_zip(zip, "images/paraglider.png"), file_exists_in_zip(zip, "images/pixel.png")]).then(res => {
          let errors = res.filter(r => !r.valid);
          if (errors.length == 0)
            done();
          else
            assert.fail('Error, some files are missing/0 byte:\n' + errors.map(e => ` - '${e.filename}'\n`).join(''));
        });
      });
    });
  });
});
/*
describe('KML validation', function () {
  this.timeout(25000);
  it('Should be valid', function (done) {
    let igccontent = fs.readFileSync('examples/flight.igc', { encoding: 'utf8', flag: 'r' });
    igc2kmz.igc2kml(igccontent).catch(err => assert.fail(err)).then(kml => {
      var xsd = x.parseXml(fs.readFileSync("test/kml21.xsd"));
      //var xsd = x.parseXml(fs.readFileSync("test/ogckml22.xsd"));
      //var xsd = x.parseXml(fs.readFileSync("test/kml22.xsd"));
      var xml = x.parseXml(kml);
      var result0 = xml.validate(xsd);
      assert(result0, "Some errors in KML");
      done();
    });
  });
});
*/
