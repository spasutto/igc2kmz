
// example :
//   node dist\igc2kmz.cmd.js examples\flight.igc
// Merge 2 IGCs and shift times to UTC+1 hour :
//   node dist\igc2kmz.cmd.js -z 1 examples\flight.igc examples\flight2.igc
// Add task infos :
//   node dist\igc2kmz.cmd.js examples\flight.igc -t examples\xctrack_task_v2.xctsk

import { unlink } from "fs";
import { writeFile } from "fs/promises";
import * as PImage from "pureimage"
import { Base64Encode } from 'base64-stream';
import concat from 'concat-stream';
import { Bitmap } from "pureimage/types/bitmap";
import { SimpleCanvas } from "./simplecanvas";
import sourcesanspro_font from '../assets/OpenSans-Regular.ttf'
import { IGC2KMZ } from "./igc2kmz";
import { defaultconfig, I2KConfiguration } from "./init";

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
      writeFile(this.fontfilename, sourcesansprofont, 'base64').then(() => {
        let fnt = PImage.registerFont(this.fontfilename, this.fontname, 400, 'bold', '');
        fnt.load(() => {
          this.font_loading = false;
          this.font_loaded = true;
          unlink(this.fontfilename, () => { });
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

export function igc2kmz(igccontents: string[] | string, infilenames?: string[] | string, taskcontent?: string, photos?: [string, Buffer][], options: I2KConfiguration = defaultconfig): Promise<ArrayBuffer> {
  igccontents = Array.isArray(igccontents) ? igccontents : [igccontents ?? ''];
  infilenames = Array.isArray(infilenames) ? infilenames : [infilenames ?? ''];
  if (infilenames.length < igccontents.length) {
    for (let i = infilenames.length; i < igccontents.length; i++) {
      infilenames.push(`track${i + 1}.igc`);
    }
  }

  let cv = new HeadlessCanvas();
  let converter = new IGC2KMZ(cv, options);
  igccontents.forEach((igc, i) => converter.addIGC(igc, (infilenames && infilenames[i]) || ''));
  if (taskcontent) {
    converter.addTask(taskcontent);
  }
  if (photos) {
    photos.forEach(photo => {
      converter.addPhoto(photo[1], photo[0]);
    });
  }
  return converter.toKMZ();
}
