
import { bilinear_gradient, default_gradient } from "./color";
import { KML } from "./kml";
import { KMZ } from "./kmz";
import { Scale, TimeScale, ZeroCenteredScale } from "./scale";
import { Flight } from "./flight";
import { Task } from "./task";
import { BoundSet, bsupdate, OpenStruct } from "./util";
import { Stock } from "./stock";

import { SimpleCanvas } from "./simplecanvas";

export interface I2KConfiguration {
  /**
   * timezone offset to apply
   */
  tz_offset: number;
  /**
   * Paraglider tail length animation.
   * false if no tail (just icon)
   */
  anim_tail: boolean;
  /**
   * Paraglider tail length animation, in seconds.
   * -1 for infinite
   */
  anim_tail_duration: number;
  /**
   * Serialize KML to console after conversion
   */
  dbg_serialize: boolean;
}

export const defaultconfig: I2KConfiguration = {
  tz_offset: 0,
  anim_tail: true,
  anim_tail_duration: 60,
  dbg_serialize: false,
};

export class FlightConvert {
  bounds: BoundSet = {};
  scales: OpenStruct<Scale> = {};
  stock: Stock = new Stock();
  task: Task | null = null;
  tz_offset: number = 0;
  altitude_styles: KML.Element[][] = [];
  graph_width: number = 600;
  graph_height: number = 300;
  default_track: string = 'solid_color';
  canvas: SimpleCanvas | null = null;
  files: string[] = [];
  flights: Flight[] = [];
  options: I2KConfiguration = defaultconfig;

  constructor(canvas?: SimpleCanvas) {
    if (canvas) {
      this.canvas = canvas;
    }
  }

  flights2kmz(flights: Flight[], options: I2KConfiguration = defaultconfig, task?: Task | null): Promise<ArrayBuffer> {
    this.flights = flights;
    this.options = options;
    this.bounds = {};
    this.scales = {};
    this.altitude_styles = [];
    this.files = [];
    //RandomIdGenerator.reset(); si on reset le generateur, il faut recréer stock
    flights.forEach(flight => {
      bsupdate(this.bounds, flight.track.bounds);
    });
    this.tz_offset = options.tz_offset * 3600;
    if (task) {
      this.task = task;
    }
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
      if (Math.abs(this.bounds["time"].max - this.bounds["time"].min) > 24 * 3600) {
        let time = Math.abs(this.bounds["time"].max - this.bounds["time"].min);
        time = Math.trunc(time / 3600);
        throw new Error(`Invalid operation : more than 24hours between flights (${time} hours)`);
      }
      this.scales["time"] = new TimeScale(this.bounds["time"], 'ground speed', 1, default_gradient, 16, this.tz_offset);
    }
    if (this.bounds["tec"] != null) {
      this.scales["tec"] = new ZeroCenteredScale(this.bounds["tec"], 'climb with energy compensation', 1, gradient);
    }
    if (this.bounds["t"] != null) {
      this.scales["t"] = new Scale(this.bounds["t"], 'time');
    }
    if (this.bounds["tas"] != null) {
      this.scales["tas"] = new Scale(this.bounds["tas"], 'air speed');
    }
    if (this.bounds["ele"]) {
      this.scales["altitude"] = new Scale(this.bounds["ele"], "altitude");
      for (let i = 0; i < 3; i++) {
        let altitude_styles: KML.Style[] = [];
        let cs = this.scales["altitude"].colors();
        for (let j = 0, c = cs[j]; j < cs.length; j++, c = cs[j]) {
          let ballon_style = new KML.BalloonStyle([new KML.SimpleElement('text', '$[description]')]);
          let icon_style = new KML.IconStyle([this.stock.icons[i], new KML.color(c), new KML.scale(this.stock.icon_scales[i].toString())]);
          let label_style = new KML.LabelStyle(c, this.stock.label_scales[i]);
          altitude_styles.push(new KML.Style([ballon_style, icon_style, label_style]));
        }
        this.stock.kmz.add_roots(altitude_styles);
        this.altitude_styles.push(altitude_styles);
      }
    }

    if (flights.length == 1) {
      if (flights[0].track.elevation_data) {
        this.default_track = 'climb';
      } else {
        this.default_track = 'speed';
      }
    }

    return new Promise<ArrayBuffer>(res => {
      let kmz: KMZ = new KMZ();
      kmz.add_siblings([this.stock.kmz]);
      //TODO ROOTS result.add_roots()
      if (task) {
        kmz.add_siblings([Flight.make_task_folder(this, task)]);
      }
      Promise.all(flights.map(f => f.to_kmz(this))).then(kmzs => {
        kmz.add_siblings(kmzs);
      }).then(() => {
        kmz.get_data(2.2, this.options.dbg_serialize).then(res);
      });
    });
  }
}
