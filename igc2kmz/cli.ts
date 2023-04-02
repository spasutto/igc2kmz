import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { defaultconfig, I2KConfiguration } from './init';
import { IGC2KMZ_BUILDDATE, IGC2KMZ_VERSION } from './igc2kmz';
import { igc2kmz } from './nodewrapper';
import * as Path from 'path';

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
    if (this.curparam) {
      this.setParamValue(this.curparam, '');
      this.curparam = null;
    }
  }
}

let options: I2KConfiguration = { ...defaultconfig };
let igccontents: string[] = [];
let filenames: string[] = [];
let taskfile: string | null = null;
let taskcontent: string | null = null;
let photos: [string, Buffer][] = [];
let outfilename: string = '';

let ap: ArgParser = new ArgParser();
ap.parse(process.argv);

ap.params.forEach(p => {
  switch (p.key) {
    case 'o':
    case 'output':
      outfilename = p.value;
      break;
    case 'z':
    case 'tz-offset':
      options.tz_offset = parseFloat(p.value);
      break;
    case 't':
    case 'task':
      taskfile = p.value;
      break;
    case 'p':
    case 'photo':
      photos.push([p.value, Buffer.from('')]);
      break;
    case 'd':
    case 'debug':
      options.dbg_serialize = true;
      break;
    case 'v':
    case 'version':
      console.log(`v${IGC2KMZ_VERSION} built on ${new Date(parseInt(IGC2KMZ_BUILDDATE)).toISOString()}`);
      //process.exit(0);
  }
});

if (ap.files.length <= 0 && !taskfile) {
  let scriptname = process.argv[1];
  let idx = scriptname.lastIndexOf(Path.sep);
  if (idx > -1) scriptname = scriptname.substring(idx + 1);
  console.log('Usage: node ' + scriptname + ' FILENAME.IGC [FILENAME2.IGC] [options]');
  console.log('Options :');
  console.log('  -o|--output    : set output filename');
  console.log('  -z|--tz-offset : set timezone offset (in hours)');
  console.log('  -t|--task      : set task file');
  console.log('  -p|--photo     : add photo');
  console.log('  -d|--debug     : set debug mode (serialize KML)');
  console.log('  -v|--version   : display build version/date');
  process.exit(1);
}

filenames = ap.files;

let tmpfiles = [...ap.files, ...photos.map(p => p[0])];
if (taskfile) tmpfiles.push(taskfile);
let success = true;
tmpfiles.forEach(f => {
  if (!existsSync(f)) {
    console.log(`Error: no such file '${f}'`);
    success = false;
  }
});
if (!success) process.exit(1);

let promises: Promise<string|Buffer>[] = [];
// igc files
for (let i = 0; i < filenames.length; i++) {
  igccontents.push();
  promises.push(new Promise(resolve => {
    readFile(filenames[i], 'utf8').then(data => {
      igccontents[i] = data;
      resolve(data);
    });
  }));
}

//task file
if (taskfile) {
  promises.push(new Promise(resolve => {
    readFile(taskfile ?? '', 'utf8').then(data => {
      taskcontent = data;
      resolve(data);
    });
  }));
}

// photos files
for (let i = 0; i < photos.length; i++) {
  //let rename = photos.filter(p => p[0] == photos[i][0]).length > 0;
  // todo multiple same file name
  promises.push(new Promise(resolve => {
    let name = photos[i][0];
    readFile(name).then(data => {
      let photo = photos.find(p => p[0] == name);
      if (photo) {
        photo[1] = data;
      }
      resolve(data);
    });
  }));
}

if (!outfilename) {
  outfilename = 'track.kmz';
  if (filenames.length > 0) outfilename = filenames[0];
  else if (taskcontent && taskfile) outfilename = taskfile;
  let i = outfilename.lastIndexOf('.');
  if (i >= 0) {
    outfilename = outfilename.substring(0, i);
  }
  if (existsSync(outfilename + '.kmz')) {
    let i = 0;
    while (existsSync(outfilename + '_' + (++i).toString() + '.kmz'));
    outfilename += '_' + i.toString() + '.kmz';
  }
}

Promise.all(promises).then(() => {
  igc2kmz(igccontents, filenames, taskcontent ?? undefined, photos, options).catch(err => console.log(err)).then(kmz => {
    if (kmz) {
      writeFile(outfilename, Buffer.from(kmz), 'binary').then(_ => console.log("output to " + outfilename));
    }
  });
});
