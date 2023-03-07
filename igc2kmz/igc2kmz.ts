
// example :
//   node dist\igc2kmz.js examples\flight.igc
// Merge 2 IGCs and shift times to UTC+1 hour :
//   node dist\igc2kmz.js -z 1 examples\flight.igc examples\flight2.igc

import IGCParser = require("igc-parser")
import { FlightConvert } from "./init";
import { Flight } from "./flight";
import { Track } from "./track";
import * as fs from 'fs';
import * as PImage from "pureimage"
import { Base64Encode } from 'base64-stream';
import concat from 'concat-stream';
import { Bitmap } from "pureimage/types/bitmap";
import { SimpleCanvas } from "./simplecanvas";

import sourcesanspro_font from '../assets/OpenSans-Regular.ttf'

class HeadlessCanvas implements SimpleCanvas {
  cvs: Bitmap[] = [];
  font_loading: boolean = false;
  font_loaded: boolean = false;
  private readonly fontfilename: string = 'OpenSans-Regular.ttf';
  readonly fontname: string = 'sans-serif';
  loadfontcbs: ((value: void | PromiseLike<void>) => void)[] = [];

  // opentype doesn't load font from data url from node context, just web
  protected loadfont(): Promise<void> {
    return new Promise(res => {
      this.loadfontcbs.push(res);
      if (this.font_loading) return;
      this.font_loading = true;
      let sourcesansprofont = sourcesanspro_font.substring(sourcesanspro_font.indexOf('base64,') + 'base64,'.length);
      fs.writeFile(this.fontfilename, sourcesansprofont, 'base64', () => {
        let fnt = PImage.registerFont(this.fontfilename, this.fontname, 400, 'bold', '');
        fnt.load(() => {
          this.font_loading = false;
          this.font_loaded = true;
          fs.unlink(this.fontfilename, () => { });
          this.loadfontcbs.forEach(r2 => r2());
        });
      });
    });
  }
  create_canvas(width: number, height: number, options?: any): Promise<Bitmap> {
    return new Promise(res => {
      let ncv = this.cvs.length;
      this.cvs.push(PImage.make(width, height, { ...options }));
      if (this.font_loaded) {
        res(this.cvs[ncv] as Bitmap);
      } else {
        this.loadfont().then(() => res(this.cvs[ncv] as Bitmap));
      }
    });
  }
  get_base64(cv: Bitmap): Promise<string> {
    return new Promise((res, rej) => {
      let base64toout = new Base64Encode();//fs.createWriteStream('out.png')
      //base64toout.pipe(process.stdout);
      base64toout.pipe(concat({ encoding: "string" }, res)).on('error', rej);
      PImage.encodePNGToStream(cv, base64toout).catch(rej);
    });
  }
}

function igc2kmz(igccontents: string[], infilenames: string[], outfilename: string, tz_offset?: number): Promise<string> {
  return new Promise<string>(res => {
    let flights: Flight[] = [];
    igccontents.forEach((igccontent, i) => {
      let igc = IGCParser.parse(igccontent, { lenient: true });
      flights.push(new Flight(new Track(igc, infilenames[i])));
    });
    //console.log(flight);
    let cv = new HeadlessCanvas();
    let fcv = new FlightConvert(cv);
    // TODO root KML
    // TODO chargement Task.from_file(open(options.task)) if options.task else None
    fcv.flights2kmz(flights, tz_offset).then(kmz => {
      fs.writeFile(outfilename, Buffer.from(kmz), 'binary', _ => console.log("output to " + outfilename));
    });
  });
}

if (process.argv.length < 3) {
  console.log('Usage: node ' + process.argv[1] + ' FILENAME.IGC');
  process.exit(1);
}
let igccontents: string[] = [];
let filenames: string[] = [];
let tzoffset: number = 0;

let outfilename = process.argv[2];
let i = outfilename.lastIndexOf('.');
if (i >= 0) {
  outfilename = outfilename.substring(0, i);
}
outfilename += '.kmz';

let onendread = () => {
  igc2kmz(igccontents, filenames, outfilename, tzoffset).catch(err => console.log(err));
};

let nextistzoffset: boolean = false;

for (let i = 2; i < process.argv.length; i++) {
  let filename = process.argv[i];
  if (nextistzoffset) {
    nextistzoffset = false;
    tzoffset = parseFloat(filename);
    if (isNaN(tzoffset)) tzoffset = 0;
    continue;
  }
  else if (filename == '-z' || filename == '--tz-offset') {
    nextistzoffset = true;
    continue;
  }
  nextistzoffset = false;
  filenames.push(filename);
}

let nbrfiles: number = filenames.length;
for (let i = 0; i < filenames.length; i++) {
  igccontents.push();
  fs.readFile(filenames[i], 'utf8', function (err, data) {
    nbrfiles--;
    if (err) throw err;
    igccontents[i] = data;
    if (nbrfiles <= 0) onendread();
  });
}
