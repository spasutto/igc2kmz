
// example :
//   node dist\igc2kmz.cmd.js examples\flight.igc
// Merge 2 IGCs and shift times to UTC+1 hour :
//   node dist\igc2kmz.cmd.js -z 1 examples\flight.igc examples\flight2.igc
// Add task infos :
//   node dist\igc2kmz.cmd.js examples\flight.igc -t examples\xctrack_task_v2.xctsk

import * as fs from 'fs';
import * as PImage from "pureimage"
import { Base64Encode } from 'base64-stream';
import concat from 'concat-stream';
import { Bitmap } from "pureimage/types/bitmap";
import { SimpleCanvas } from "./simplecanvas";
import { defaultconfig, I2KConfiguration } from './init';
import { igc2kmz } from './igc2kmz';
import sourcesanspro_font from '../assets/OpenSans-Regular.ttf'
import * as Path from 'path';

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

interface KeyValuePair<TKey, TValue> {
  key: TKey;
  value: TValue;
}
const regparam = /^-(?:-([\w-]{2,})|([a-zA-Z]+))=?(.*)$/;
class ArgParser {
  files: string[] = [];
  params:KeyValuePair<string, string>[] = [];
  curparam: string | null = null;

  setParamValue(param: string, value: string) {
    this.params.push({ key: param, value: value });
    //console.log(`param '${param}' found with value '${value}'`);
  }
  parse(argv: string[]) {
    for (let i = 2; i < argv.length; i++) {
      let arg = argv[i];
      if (this.curparam != null) {
        this.setParamValue(this.curparam, arg);
        this.curparam = null;
        continue;
      }
      let matches = arg.match(regparam);
      if (!matches) {//!regparam.test(arg)) {
        this.files.push(arg);
      } else {
        let param = matches[1] ?? matches[2];
        let value = matches[3];
        if (value.trim().length == 0) {
          this.curparam = param;
        } else {
          this.curparam = null;
          this.setParamValue(param, value);
        }
      }
    }
  }
}

let options: I2KConfiguration = { ...defaultconfig };
let igccontents: string[] = [];
let filenames: string[] = [];
let taskfile: string | null = null;
let taskcontent: string | null = null;

let ap: ArgParser = new ArgParser();
ap.parse(process.argv);

ap.params.forEach(p => {
  switch (p.key) {
    case 'z':
    case 'tz-offset':
      options.tz_offset = parseFloat(p.value);
      break;
    case 't':
    case 'task':
      taskfile = p.value;
      break;
    case 'd':
    case 'debug':
      options.dbg_serialize = true;
      break;
  }
});

if (ap.files.length <= 0 && !taskfile) {
  let scriptname = process.argv[1];
  let idx = scriptname.lastIndexOf(Path.sep);
  if (idx > -1) scriptname = scriptname.substring(idx + 1);
  console.log('Usage: node ' + scriptname + ' FILENAME.IGC [FILENAME2.IGC] [options]');
  console.log('Options :');
  console.log('  -z|-tz-offset : set timezone offset (in hours)');
  console.log('  -t|-task      : set task file');
  console.log('  -d|-debug     : set debug mode (serialize KML)');
  process.exit(1);
}

filenames = ap.files;

let tmpfiles = [...ap.files];
if (taskfile) tmpfiles.push(taskfile);
tmpfiles.forEach(f => {
  if (!fs.existsSync(f)) {
    console.log(`Error: no such file '${f}'`);
    process.exit(1);
  }
});

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

let outfilename = 'track.kmz';
if (filenames.length > 0) outfilename = filenames[0];
else if (taskcontent && taskfile) outfilename = taskfile;
let i = outfilename.lastIndexOf('.');
if (i >= 0) {
  outfilename = outfilename.substring(0, i);
}
if (fs.existsSync(outfilename + '.kmz')) {
  let i = 0;
  while (fs.existsSync(outfilename + '_' + (++i).toString() + '.kmz'));
  outfilename += '_' + i.toString() + '.kmz';
}

Promise.all(promises).then(() => {
  let cv = new HeadlessCanvas();
  igc2kmz(cv, igccontents, filenames, taskcontent ?? undefined, options).catch(err => console.log(err)).then(kmz => {
    if (kmz) {
      fs.writeFile(outfilename, Buffer.from(kmz), 'binary', _ => console.log("output to " + outfilename));
    }
  });
});
