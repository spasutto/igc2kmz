
import IGCParser = require("igc-parser")
import { FlightConvert } from "./init";
import { Flight } from "./flight";
import { Track } from "./track";
import { SimpleCanvas } from './simplecanvas';
import { saveAs } from 'file-saver';

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

function igc2kmz(igccontents: string[] | string, filenames?: string[] | string, tz_offset?: number): Promise<string> {
  return new Promise<string>(res => {
    igccontents = Array.isArray(igccontents) ? igccontents : [igccontents ?? ''];
    filenames = Array.isArray(filenames) ? filenames : [filenames ?? ''];
    if (filenames.length < igccontents.length) {
      for (let i = filenames.length; i < igccontents.length; i++) {
        filenames.push(`track${i+1}.igc`);
      }
    }
    let flights = [];
    for (let i = 0; i < igccontents.length; i++) {
      let igc = IGCParser.parse(igccontents[i], {lenient: true});
      flights.push(new Flight(new Track(igc, filenames[i])));
    }
    let cv = new WebCanvas();
    let fcv = new FlightConvert(cv);
    // TODO root KML
    // TODO chargement Task.from_file(open(options.task)) if options.task else None
    fcv.flights2kmz(flights, tz_offset).then(kmz => {
      let outfilename = 'track.kmz';
      if (Array.isArray(filenames) && filenames.length > 0) {
        let i = filenames[0].lastIndexOf('.');
        if (i >= 0) {
          outfilename = filenames[0].substring(0, i) + '.kmz';
        } else {
          outfilename = filenames[0] + '.kmz';
        }
      }
      if (kmz) {
        saveAs(new Blob([kmz]), outfilename);
      }
      res(outfilename);
    });
  });
}

if (typeof window === 'object') {
  window.igc2kmz = igc2kmz;
}
