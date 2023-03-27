
import { defaultconfig, I2KConfiguration } from "./init";
import { SimpleCanvas } from './simplecanvas';
import { saveAs } from 'file-saver';
import { igc2kmz, IGC2KMZ_BUILDDATE, IGC2KMZ_DEFAULT_CONFIGURATION, IGC2KMZ_VERSION } from "./igc2kmz";

declare global {
  interface Window {
    igc2kmz: any;
    DEFAULT_IGC2KMZ_CONFIGURATION: any;
    IGC2KMZ_VERSION: string;
    IGC2KMZ_BUILDDATE: Date;
  }
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
  function igc2kmzwrapper(igccontents: string[] | string, infilenames?: string[] | string, taskcontent?: string, photos?: [string, Buffer][], options?:I2KConfiguration) {
    let cv = new WebCanvas();
    infilenames = Array.isArray(infilenames) ? infilenames : [infilenames ?? ''];
    let outfilename = infilenames.length > 0 && infilenames[0].trim().length > 0 ? infilenames[0] : 'track.igc';
    let i = outfilename.lastIndexOf('.');
    if (i >= 0) {
      outfilename = outfilename.substring(0, i);
    }
    outfilename += '.kmz';
    return new Promise<string>(res => {
      igc2kmz(cv, igccontents, infilenames, taskcontent, photos, options).then(kmz => {
        if (kmz) {
          saveAs(new Blob([kmz]), outfilename);
          res(outfilename);
        }
      });
    });
  }

  window.igc2kmz = igc2kmzwrapper;
  window.DEFAULT_IGC2KMZ_CONFIGURATION = IGC2KMZ_DEFAULT_CONFIGURATION;
  window.IGC2KMZ_VERSION = IGC2KMZ_VERSION;
  window.IGC2KMZ_BUILDDATE = new Date(parseInt(IGC2KMZ_BUILDDATE));
}
