
// example :
//   node dist\igc2kmz.js examples\flight.igc

import IGCParser = require("igc-parser")
import { KMZ } from "./kmz";
import { Flight, FlightConvert } from "./init";
import { Track } from "./track";
import * as fs from 'fs';
import * as PImage from "pureimage"
import { Base64Encode } from 'base64-stream';
import concat from 'concat-stream';
import { Bitmap } from "pureimage/types/bitmap";
import { SimpleCanvas } from "./simplecanvas";

class HeadlessCanvas implements SimpleCanvas {
  cv: Bitmap | null = null;
  create_canvas(width: number, height: number, options?: any): Bitmap {
    this.cv = PImage.make(width, height, {...options});
    return this.cv;
  }
  get_base64(): Promise<string> {
    return new Promise((res, rej) => {
      if (this.cv == null) {
        rej('no canvas');
      } else {
        let base64toout = new Base64Encode();//fs.createWriteStream('out.png')
        //base64toout.pipe(process.stdout);
        base64toout.pipe(concat({ encoding: "string" }, res)).on('error', rej);
        PImage.encodePNGToStream(this.cv, base64toout).catch(rej);
      }
    });
  }
}

export function igc2kmz(igccontent: string, infilename: string, outfilename: string): Promise<string> {
  return new Promise<string>(res => {
    let igc = IGCParser.parse(igccontent, {lenient: true});
    let flight = new Flight(new Track(igc, infilename));
    //console.log(flight);
    let cv = new HeadlessCanvas();
    let fcv = new FlightConvert(cv);
    // TODO root KML
    // TODO chargement Task.from_file(open(options.task)) if options.task else None
    fcv.flights2kmz([flight]).then(kmz => {
      fs.writeFile(outfilename, Buffer.from(kmz), 'binary', _ => console.log("output to " + outfilename));
    });
  });
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
  igc2kmz(data, filename, outfile).catch(err => console.log(err));
});
