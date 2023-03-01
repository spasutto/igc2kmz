
// example :
//   node dist\igc2kmz.js examples\flight.igc

import IGCParser = require("igc-parser")
import { KMZ } from "./kmz";
import { Flight, FlightConvert } from "./init";
import { Track } from "./track";
import * as fs from 'fs';
import * as PImage from "pureimage"
import {Base64Encode } from 'base64-stream';

export function igc2kmz(igccontent: string, infilename: string, outfilename: string): KMZ | null {
  const img1 = PImage.make(100, 100, {});
  const ctx = img1.getContext('2d');
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 100, 100);
  ctx.strokeStyle = 'blue';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(50, 50);
  ctx.stroke();
  let base64toout = (new Base64Encode());//.pipe(process.stdout);
  base64toout.pipe(process.stdout);
  //PImage.encodePNGToStream(img1, fs.createWriteStream('out.png')).then(() => {
  PImage.encodePNGToStream(img1, base64toout).then(() => {
    console.log("wrote out the png file to out.png");
  }).catch((e) => {
    console.log("there was an error writing");
  });
  return null;
  let igc = IGCParser.parse(igccontent);
  let flight = new Flight(new Track(igc, infilename));
  //console.log(flight);
  let cv = new FlightConvert();
  // TODO root KML
  // TODO chargement Task.from_file(open(options.task)) if options.task else None
  let kmz = cv.flights2kmz([flight]);
  if (kmz) {
    kmz.getKMZ(2.2).generateAsync({ type: "nodebuffer" }).then(function (content) {
      fs.writeFile(outfilename, content, 'binary', _ => console.log("output to " + outfilename));
    });
  }
  return kmz;
}

if (process.argv.length < 3) {
  console.log('Usage: node ' + process.argv[1] + ' FILENAME.IGC');
  process.exit(1);
}
let filename = process.argv[2];
fs.readFile(filename, 'utf8', function(err, data) {
  if (err) throw err;
  let outfile = filename;
  let i = filename.lastIndexOf('.');
  if (i >= 0) {
    outfile = filename.substring(0, i) + '.kmz';
  }
  igc2kmz(data, filename, outfile);
});
