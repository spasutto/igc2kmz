
import IGCParser = require("igc-parser")
import { FlightConvert } from "./init";
import { Flight } from "./flight";
import { Track } from "./track";
import { SimpleCanvas } from './simplecanvas';
import { saveAs } from 'file-saver';
import { Task } from "./task";
import { igc2kmz } from "./igc2kmz";

declare global {
    interface Window { igc2kmz: any; }
}

class WebCanvas implements SimpleCanvas {
  readonly fontname: string = 'Source Sans Pro';
  create_canvas(width: number, height: number): Promise<HTMLCanvasElement> {
    return new Promise(res => {
      let cv = document.createElement('canvas');
      cv.setAttribute('width', width.toString());
      cv.setAttribute('height', height.toString());
      res(cv);
    });
  }
  get_base64(cv: HTMLCanvasElement): Promise<string> {
    return new Promise(res => {
      let imgdata = cv.toDataURL();
      res(imgdata.substring(imgdata.indexOf('base64,') + 'base64,'.length));
    });
  }
}

if (typeof window === 'object') {
  function igc2kmzwrapper(igccontents: string[] | string, infilenames?: string[] | string, tz_offset?: number, taskcontent?: string) {
    let cv = new WebCanvas();
    infilenames = Array.isArray(infilenames) ? infilenames : [infilenames ?? ''];
    let outfilename = infilenames.length > 0 && infilenames[0].trim().length > 0 ? infilenames[0] : 'track.igc';
    let i = outfilename.lastIndexOf('.');
    if (i >= 0) {
      outfilename = outfilename.substring(0, i);
    }
    outfilename += '.kmz';
    return new Promise<string>(res => {
      igc2kmz(cv, igccontents, infilenames, tz_offset, taskcontent).then(kmz => {
        if (kmz) {
          saveAs(new Blob([kmz]), outfilename);
          res(outfilename);
        }
      });
    });
  }

  window.igc2kmz = igc2kmzwrapper;
}
