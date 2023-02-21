
import { default_gradient } from "./color";
import { Scale } from "./scale";
import { Task } from "./task";
import { Track } from "./track";
import { BoundSet, bsupdate, OpenStruct } from "./util";

export class Flight {
  track: Track;
  altitude_mode: string;
  color: string;
  width: number;
  pilot_name: string;
  glider_type: string;
  glider_id: string;
  photos: string[] = [];
  url: string = "";

  constructor(track: Track) {
    this.track = track;
    this.altitude_mode = "ff0000ff";
    this.color = "ff0000ff";
    this.width = 2;
    this.pilot_name = track.pilot_name;
    this.glider_type = track.glider_type;
    this.glider_id = track.glider_id;
  }
}

class Stock {

}

export class FlightConvert {
  bounds: BoundSet = {};
  scales: OpenStruct = {};
  stock: Stock = {};
  task: Task|null = null;
  tz_offset: number = 0;

  flights2kmz(flights: Flight[], tz_offset: number = 0, task?: Task): void {
    flights.forEach(flight => {
      bsupdate(this.bounds, flight.track.bounds);
    });
    if (this.bounds["climb"] != null) {
      if (this.bounds["climb"].min < -5) {
        this.bounds["climb"].min = -5;
      } else if (this.bounds["climb"].max > 5) {
        this.bounds["climb"].max = 5;
      }
      this.tz_offset = tz_offset * 3600;
      if (task) {
        this.task = task;
      }
      if (this.bounds["ele"]) {
        this.scales["altitude"] = new Scale(this.bounds["ele"], "altitude", default_gradient);
      }
    }
  }
}
