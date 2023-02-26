
import IGCParser = require("igc-parser")
import { KMZ } from "./kmz";
import { Flight, FlightConvert } from "./init";
import { Track } from "./track";

declare global {
    interface Window { igc2kmz: any; }
}

function igc2kmz(igccontent: string): KMZ | null {
  let igc = IGCParser.parse(igccontent);
  let flight = new Flight(new Track(igc));
  //console.log(flight);
  let cv = new FlightConvert();
  // TODO root KML
  // TODO chargement Task.from_file(open(options.task)) if options.task else None
  let kmz = cv.flights2kmz([flight]);
  if (kmz) {
    cv.download(kmz.getKMZ(2.2));
  }
  return kmz;
}


if (typeof window === 'object') {
  window.igc2kmz = igc2kmz;
}
