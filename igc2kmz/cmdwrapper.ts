
// example :
//   node dist\igc2kmz.js examples\flight.igc
// Merge 2 IGCs and shift times to UTC+1 hour :
//   node dist\igc2kmz.js -z 1 examples\flight.igc examples\flight2.igc
// Add task infos :
//   node dist\igc2kmz.js examples\flight.igc -t examples\xctrack_task_v2.xctsk

import * as fs from 'fs';
import * as PImage from "pureimage"
import { Base64Encode } from 'base64-stream';
import concat from 'concat-stream';
import { Bitmap } from "pureimage/types/bitmap";
import { SimpleCanvas } from "./simplecanvas";
import { defaultconfig, I2KConfiguration } from './init';
import { igc2kmz } from './igc2kmz';
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

if (process.argv.length < 3) {
  console.log('Usage: node ' + process.argv[1] + ' FILENAME.IGC');
  process.exit(1);
}
let igccontents: string[] = [];
let filenames: string[] = [];
let tzoffset: number = 0;
let taskfile: string | null = null;
let taskcontent: string | null = null;

let outfilename = process.argv[2];
let i = outfilename.lastIndexOf('.');
if (i >= 0) {
  outfilename = outfilename.substring(0, i);
}
outfilename += '.kmz';

let nextistzoffset: boolean = false;
let nextistaskfile: boolean = false;

for (let i = 2; i < process.argv.length; i++) {
  let filename = process.argv[i];
  if (filename == '-z' || filename == '--tz-offset') {
    nextistzoffset = true;
    continue;
  } else if (filename == '-t' || filename == '--task') {
    nextistaskfile = true;
    continue;
  }
  if (nextistzoffset) {
    nextistzoffset = false;
    tzoffset = parseFloat(filename);
    if (isNaN(tzoffset)) tzoffset = 0;
    continue;
  } else if (nextistaskfile) {
    nextistaskfile = false;
    taskfile = filename;
    continue;
  }
  nextistaskfile = nextistzoffset = false;
  filenames.push(filename);
}

let promises: Promise<string>[] = [];
// igc files
for (let i = 0; i < filenames.length; i++) {
  igccontents.push();
  promises.push(new Promise((resolve, reject) => {
    fs.readFile(filenames[i], 'utf8', function (err, data) {
      if (err) {
        reject(err);
      }
      else {
        igccontents[i] = data;
        resolve(data);
      }
    });
  }));
}

//task file
if (taskfile) {
  promises.push(new Promise((resolve, reject) => {
    fs.readFile(taskfile ?? '', 'utf8', function (err, data) {
      if (err) {
        reject(err);
      }
      else {
        taskcontent = data;
        resolve(data);
      }
    });
  }));
}

Promise.all(promises).then(() => {
  let cv = new HeadlessCanvas();
  let options: I2KConfiguration = { ...defaultconfig, tz_offset: tzoffset };
  igc2kmz(cv, igccontents, filenames, taskcontent ?? undefined, options).catch(err => console.log(err)).then(kmz => {
    if (kmz) {
      fs.writeFile(outfilename, Buffer.from(kmz), 'binary', _ => console.log("output to " + outfilename));
    }
  });
});
