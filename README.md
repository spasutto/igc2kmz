# igc2kmz
igc2kmz is a tool to convert IGC (flight recorder) to KMZ/KML (Google Earth).

> *It's aTypescript port of Tom Payne's python tool [igc2kmz](https://github.com/twpayne/igc2kmz)*

**The resulting tool is available online here : [&#x2192; igc2kmz.html &#x2190;](https://spasutto.github.io/igc2kmz/igc2kmz.html)** (it can also be used in command line, see [below](#usage))

[![Visualisation example](doc/output_MtBlanc.jpg?raw=true)](doc/output_MtBlanc.jpg?raw=true)

## Usage
**For the web** : See [igc2kmz.html](igc2kmz.html) or [example.html](examples/example.html) ('*hello world*' code), Single Page Application [available here](https://spasutto.github.io/igc2kmz/dist/igc2kmz_spa.html) (right click and save it to computer/phone)

:warning: As of now, web version runs on the UI thread and on slow machines or with big flight it can block the page for some time :boom:

**Command line** : [build first](#build) then on a prompt :
```
node dist\igc2kmz.cmd.js examples\flight.igc
```
Upload to [Google Earth](https://earth.google.com/web/), voilà!

:information_source: *Note* : animations doesn't seem to work on web version of earth, but are ok on desktop version...

## Features
#### Animation
[![Visualisation example](doc/animation.webp?raw=true)](doc/animation.webp?raw=true)
#### Glides / thermals visualisation :
[![Visualisation example](doc/thermals_glides.jpg?raw=true)](doc/thermals_glides.jpg?raw=true)
#### Photos (placed at GPS position)
[![Visualisation example](doc/inline_photos.jpg?raw=true)](doc/inline_photos.jpg?raw=true)
#### XC Score :
> *computed by [igc-xc-score](https://github.com/mmomtchev/igc-xc-score)*

[![Visualisation example](doc/xc_score.jpg?raw=true)](doc/xc_score.jpg?raw=true)
#### Extruded path :
[![Visualisation example](doc/extruded_path.jpg?raw=true)](doc/extruded_path.jpg?raw=true)
#### Task visualization :
> *XC Track file format (.xctsk)*

[![Visualisation example](doc/task.jpg?raw=true)](doc/task.jpg?raw=true)

## Build
Get [sources from the repository](https://github.com/spasutto/igc2kmz) and install npm dependencies
```
git clone https://github.com/spasutto/igc2kmz.git
cd igc2kmz
npm install
```
then
```
npm run build     # for command line usage
#  or
npm run minify    # for web
npm run buildweb  # for web (development)
#  or
npm run buildnode # for use as library
```

## Reusing
### web

[build web/minify version first](#build), then see [examples/example.html](https://github.com/spasutto/igc2kmz/blob/master/examples/example.html)

### node
[build node version first](#build), copy `dist/igc2kmz.js` then in a new javascript file :
```javascript
var igc2kmz = require('igc2kmz');
const fs = require('fs');

var igccontent = fs.readFileSync('examples/flight.igc', { encoding: 'utf8', flag: 'r' });
var outfilename = "output.kmz";
igc2kmz.igc2kmz(igccontent).catch(err => console.log(err)).then(kmz => {
  if (kmz) {
    fs.writeFileSync(outfilename, Buffer.from(kmz), 'binary');
    console.log("output to " + outfilename);
  }
});
```

## Bugs/todo
 - tests
 - versioning
 - worker for web version
 - others tasks formats
 - warnings on fonts via pureimage
 - warning on Buffer() (outdated pngjs of pureimage)
 - get real altitude and correct IGC or convert from QFE

