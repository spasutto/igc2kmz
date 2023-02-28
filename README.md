# igc2kmz
Typescript port of Tom Payne's python tool [igc2kmz](https://github.com/twpayne/igc2kmz) (**work in progress**)

[![Visualisation example](doc/output_MtBlanc.jpg?raw=true)](doc/output_MtBlanc.jpg?raw=true)

## Usage
See [examples/igc2kmz.html](examples/igc2kmz.html)

**Command line** : [build first](#build) then on a prompt :
```
node dist\igc2kmz.js examples\flight.igc
```
Upload to [Google Earth](https://earth.google.com/web/), voilà!

:information_source: *Note* : animations don't seem to work on web version of earth, but are ok on desktop version...

## Build
Get [sources from the repository](https://github.com/spasutto/igc2kmz) and install npm dependencies
```
git clone https://github.com/spasutto/igc2kmz.git
cd igc2kmz
npm install
```
then
```
npm run build      # for command line usage
#  or
npm run buildweb   # for web
```

## Bugs/todo
 - tests
 - versioning
 - overlayXY scale chart incorrect value
 - charts (google)
 - png icons
 - command line usage
   - photos
   - tasks
 - hide past/futur point in animation?
