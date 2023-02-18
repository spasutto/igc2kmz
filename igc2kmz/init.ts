
import { Track } from "./track";
import { OpenStruct } from "./util";

export class Flight {
  track: Track;
  altitude_mode: string;
  color: string;
  constructor(track: Track) {
    this.track = track;
    this.altitude_mode = "ff0000ff";
    this.color = "ff0000ff";
  }
}

export function flights2kmz(flights: string[]): void {
  let globals: OpenStruct = new OpenStruct();
  console.log(globals.a);
}
