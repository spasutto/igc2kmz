
import IGCParser = require("igc-parser")
import { KMZ } from "./kmz";
import { Flight, FlightConvert } from "./init";
import { Track } from "./track";
import { SimpleCanvas } from './simplecanvas';

declare global {
    interface Window { igc2kmz: any; }
}

class WebCanvas implements SimpleCanvas {
  cv: HTMLCanvasElement | null = null;
  create_canvas(width: number, height: number): HTMLCanvasElement {
    this.cv = document.createElement('canvas');
    this.cv.setAttribute('width', '100');
    this.cv.setAttribute('height', '100');
    return this.cv;
  }
  get_base64(): Promise<string> {
    return new Promise((res, rej) => {
      if (this.cv == null) {
        rej('no canvas');
      } else {
        let imgdata = this.cv.toDataURL();
        res(imgdata.substring(imgdata.indexOf('base64,') + 'base64,'.length));
      }
    });
  }
}

function igc2kmz(igccontent: string, filename?: string): Promise<KMZ> {
  let igc = IGCParser.parse(igccontent);
  let flight = new Flight(new Track(igc, filename));
  //console.log(flight);
  let cv = new WebCanvas();
  let fcv = new FlightConvert(cv);
  // TODO root KML
  // TODO chargement Task.from_file(open(options.task)) if options.task else None
  return new Promise<KMZ>(res => {
    fcv.flights2kmz([flight]).then(kmz => {
      let outfilename = filename;
      if (filename) {
        let i = filename.lastIndexOf('.');
        if (i >= 0) {
          outfilename = filename.substring(0, i) + '.kmz';
        }
      }
      if (kmz) {
        fcv.download(kmz.getKMZ(2.2), outfilename);
      }
      res(kmz);
    });
  });
}

if (typeof window === 'object') {
  window.igc2kmz = igc2kmz;
}
