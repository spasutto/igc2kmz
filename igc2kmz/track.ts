import { IGCFile } from "igc-parser";
import { Coord } from "./coord";

export class Track {
  flight: IGCFile;
  coords: Coord[];
  constructor(flight: IGCFile) {
    this.flight = flight;
    this.coords = flight.fixes.map(f => Coord.deg(f.latitude, f.longitude, (f.pressureAltitude??f.gpsAltitude) || 0));// [Coord.deg(15, 12, 1500)];
  }
}
