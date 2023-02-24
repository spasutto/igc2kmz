
import { bilinear_gradient, default_gradient } from "./color";
import { KML } from "./kml";
import { KMZ } from "./kmz";
import { Scale, TimeScale, ZeroCenteredScale } from "./scale";
import { Task } from "./task";
import { Track } from "./track";
import { BoundSet, bsupdate, OpenStruct, RandomIdGenerator } from "./util";

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
  icons: KML.Icon[] = [];
  icon_scales: number[];
  label_scales: number[];

  constructor() {
    this.icons = [25, 25, 24, 24].map(v => KML.Icon.palette(4, v));
    this.icon_scales = [0.6, 0.5, 0.4, 0.3].map(v => Math.sqrt(v));
    this.label_scales = [0.6, 0.5, 0.4, 0.3].map(v => Math.sqrt(v));
  }
}

export class FlightConvert {
  bounds: BoundSet = {};
  scales: OpenStruct<Scale> = {};
  stock: Stock = new Stock();
  task: Task|null = null;
  tz_offset: number = 0;
  altitude_styles: KML.Element[] = [];

  flights2kmz(flights: Flight[], tz_offset: number = 0, task?: Task): KMZ | null {
    flights.forEach(flight => {
      bsupdate(this.bounds, flight.track.bounds);
    });
    let gradient = bilinear_gradient;
    if (this.bounds["climb"] != null) {
      if (this.bounds["climb"].min < -5) {
        this.bounds["climb"].min = -5;
      } else if (this.bounds["climb"].max > 5) {
        this.bounds["climb"].max = 5;
      }
      this.scales["climb"] = new ZeroCenteredScale(this.bounds["climb"], 'climb', 0.1, gradient);
    }
    if (this.bounds["speed"] != null) {
      this.scales["speed"] = new Scale(this.bounds["speed"], 'ground speed');
    }
    if (this.bounds["time"] != null) {
      this.scales["time"] = new TimeScale(this.bounds["time"], 'ground speed', 1, default_gradient, 16, this.tz_offset);
    }
    this.tz_offset = tz_offset * 3600;
    if (task) {
      this.task = task;
    }
    if (this.bounds["ele"]) {
      this.scales["altitude"] = new Scale(this.bounds["ele"], "altitude");
      for (let i = 0; i < 3; i++) {
        let altitude_styles: KML.Style[] = [];
        let cs = this.scales["altitude"].colors();
        for (let j = 0, c = cs[j]; j < cs.length; j++, c = cs[j]) {
          let ballon_style = new KML.BalloonStyle([new KML.SimpleElement('text', '$[description]')]);
          let icon_style = new KML.IconStyle([this.stock.icons[i], new KML.SimpleElement('color', c.toHexString()), new KML.SimpleElement('scale', this.stock.icon_scales[i].toString())]);
          let label_style = new KML.LabelStyle([new KML.SimpleElement('color', c.toHexString()), new KML.SimpleElement('scale', this.stock.label_scales[i].toString())]);
          altitude_styles.push(new KML.Style([ballon_style, icon_style, label_style]));
        }
        altitude_styles.forEach(s => this.altitude_styles.push(s));
      }
    }

    let kml: KML.KML = new KML.KML(this.altitude_styles);
    /*console.log(kml.serialize());
    let pouet = new KML.BalloonStyle([new KML.SimpleElement('text', '$[description]')]);
    console.log(pouet.serialize());*/
    /*
    let ids = [];
    const nbrtot = 7000;
    RandomIdGenerator.globalcounter = 0;
    var startTime = performance.now();
    for (let i = 0; i < nbrtot; i++)
      ids.push(RandomIdGenerator.makeid());
    var endTime = performance.now();
    console.log(ids);
    console.log(`${nbrtot} calls to RandomIdGenerator took ${Math.round((endTime - startTime) * 100) / 100} milliseconds, ${Math.round(100 * (RandomIdGenerator.globalcounter - nbrtot) / RandomIdGenerator.globalcounter)}% de tirs inutiles`);
    */
    return new KMZ(kml);
  }
}
