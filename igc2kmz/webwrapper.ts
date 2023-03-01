
import IGCParser = require("igc-parser")
import { KMZ } from "./kmz";
import { Flight, FlightConvert } from "./init";
import { Track } from "./track";

declare global {
    interface Window { igc2kmz: any; }
}

function igc2kmz(igccontent: string, filename?: string): KMZ | null {
  const img1 = document.createElement('canvas');
  img1.setAttribute('width', '100');
  img1.setAttribute('height', '100');
  const ctx = img1.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
    ctx.strokeStyle = 'blue';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(50, 50);
    ctx.stroke();
    console.log(img1.toDataURL());
    document.body.append(img1);
  }
  return null;
  let igc = IGCParser.parse(igccontent);
  let flight = new Flight(new Track(igc, filename));
  //console.log(flight);
  let cv = new FlightConvert();
  // TODO root KML
  // TODO chargement Task.from_file(open(options.task)) if options.task else None
  let kmz = cv.flights2kmz([flight]);
  let outfilename = filename;
  if (filename) {
    let i = filename.lastIndexOf('.');
    if (i >= 0) {
      outfilename = filename.substring(0, i) + '.kmz';
    }
  }
  if (kmz) {
    cv.download(kmz.getKMZ(2.2), outfilename);
  }
  return kmz;
}

if (typeof window === 'object') {
  window.igc2kmz = igc2kmz;
}
