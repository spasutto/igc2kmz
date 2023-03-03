
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
      cv.setAttribute('width', '100');
      cv.setAttribute('height', '100');
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

function igc2kmz(igccontent: string, filename?: string): Promise<string> {
  return new Promise<string>(res => {
    let igc = IGCParser.parse(igccontent, {lenient: true});
    let flight = new Flight(new Track(igc, filename));
    //console.log(flight);
    let cv = new WebCanvas();
    let fcv = new FlightConvert(cv);
    // TODO root KML
    // TODO chargement Task.from_file(open(options.task)) if options.task else None
    fcv.flights2kmz([flight]).then(kmz => {
      let outfilename = 'track.kmz';
      if (filename) {
        let i = filename.lastIndexOf('.');
        if (i >= 0) {
          outfilename = filename.substring(0, i) + '.kmz';
        } else {
          outfilename = filename + '.kmz';
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
