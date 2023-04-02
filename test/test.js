var assert = require('assert');
var fs = require('fs');
var igc2kmz = require('../dist/igc2kmz.js');

/*describe('#indexOf()', function () {
  it('should return -1 when the value is not present', function () {
    assert.equal([1, 2, 3].indexOf(4), -1);
  });
});*/

describe('Simple command line test', function () {
  //fs.existsSync(path)
  this.timeout(15000);
  it('should create kmz file for igc sample', function (done) {
    let igccontent = fs.readFileSync('examples/flight.igc', { encoding: 'utf8', flag: 'r' });
    igc2kmz.igc2kmz(igccontent).catch(err => console.log(err)).then(kmz => {
      done();
    });
  });
});
