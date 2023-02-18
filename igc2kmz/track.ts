import { IGCFile } from "igc-parser";
import { Coord } from "./coord";
import { Bounds, BoundSet } from "./util";

export class Track {
  flight: IGCFile;
  coords: Coord[];
  pilot_name: string;
  glider_type: string;
  glider_id: string;
  bounds: BoundSet = {};
  constructor(flight: IGCFile) {
    this.flight = flight;
    this.coords = Track.filter(flight.fixes.map(f => Coord.deg(f.latitude, f.longitude, (f.pressureAltitude ?? f.gpsAltitude) || 0, new Date(f.timestamp))));
    this.pilot_name = flight.pilot || "";
    this.glider_type = flight.gliderType || "";
    this.glider_id = flight.registration || "";
    // TODO parse I records
    // TODO parse C records (propriété task à convertir dans propriété declaration)
    this.analyse(20);
  }

  static filter(coords: Coord[]): Coord[] {
    let result: Coord[] = [coords[0]];
    let last_c: Coord = coords[0];
    let c: Coord;
    for (let i = 0; i < coords.length; i++) {
      c = coords[i];
      if (c.dt <= last_c.dt)
        continue;
      let ds = last_c.distance_to(c);
      let dt = (c.dt.getTime() - last_c.dt.getTime()) / 1000;
      if (dt == 0 || ds / dt > 100)
        continue;
      let dz = c.ele - last_c.ele;
      if (dz / dt < -30 || 30 < dz / dt)
        continue;
      result.push(c);
      last_c = c;
    }

    return result;
  }

  analyse(dt: number) {
    let n = this.coords.length;
    let period = ((this.coords[n - 1].dt.getTime() - this.coords[0].dt.getTime()) / 1000) / n;
    if (dt < 2 * period)
      dt = 2 * period;
    this.bounds["ele"] = new Bounds(this.coords.map(c => c.ele));
    this.bounds["time"] = new Bounds([this.coords[0].dt, this.coords[n - 1].dt]);
  }
}
