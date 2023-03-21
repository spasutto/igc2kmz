# igc2kmz
> *Typescript port of Tom Payne's python tool [igc2kmz](https://github.com/twpayne/igc2kmz)*

**The resulting tool is available online here : [&#x2192; igc2kmz.html &#x2190;](https://spasutto.github.io/igc2kmz/igc2kmz.html)** (it can also be used in command line, see [below](#usage))

[![Visualisation example](doc/output_MtBlanc.jpg?raw=true)](doc/output_MtBlanc.jpg?raw=true)

## Usage
**For the web** : See [igc2kmz.html](igc2kmz.html) or [example.html](examples/example.html) ('*hello world*' code)

:warning: As of now, web version runs on the UI thread and on slow machines or with big flight it can block the page for some time :boom:

**Command line** : [build first](#build) then on a prompt :
```
node dist\igc2kmz.cmd.js examples\flight.igc
```
Upload to [Google Earth](https://earth.google.com/web/), voilà!

:information_source: *Note* : animations doesn't seem to work on web version of earth, but are ok on desktop version...

## Build
Get [sources from the repository](https://github.com/spasutto/igc2kmz) and install npm dependencies
```
git clone https://github.com/spasutto/igc2kmz.git
cd igc2kmz
npm install
```
then
```
npm run build    # for command line usage
#  or
npm run minify   # for web
npm run buildweb # for web (development)
```

## Features
#### Animation
[![Visualisation example](doc/animation.webp?raw=true)](doc/animation.webp?raw=true)
#### Glides / thermals visualisation :
[![Visualisation example](doc/thermals_glides.jpg?raw=true)](doc/thermals_glides.jpg?raw=true)
#### Photos (placed at GPS position)
[![Visualisation example](doc/inline_photos.jpg?raw=true)](doc/inline_photos.jpg?raw=true)
#### Extruded path :
[![Visualisation example](doc/extruded_path.jpg?raw=true)](doc/extruded_path.jpg?raw=true)
#### Task visualization :
[![Visualisation example](doc/task.jpg?raw=true)](doc/task.jpg?raw=true)

## Bugs/todo
 - tests
 - versioning
 - worker for web version
 - command line usage
 - others tasks formats
 - warnings on fonts via pureimage
 - warning on Buffer() (outdated pngjs of pureimage)
