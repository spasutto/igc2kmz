
import { bilinear_gradient, default_gradient } from "./color";
import { KML } from "./kml";
import { KMZ } from "./kmz";
import { Scale, TimeScale, ZeroCenteredScale } from "./scale";
import { Flight } from "./flight";
import { Task } from "./task";
import { BoundSet, bsupdate, OpenStruct, SEALEVEL_QNH } from "./util";
import { Stock } from "./stock";

import { SimpleCanvas } from "./simplecanvas";

export interface I2KConfiguration {
  /**
   * timezone offset to apply
   */
  tz_offset: number;
  /**
   * Use barometric altitude instead of GPS
   */
  pressure_altitude: boolean;
  /**
   * QNH for barometric altitude
   */
  qnh: number;
  /**
   * set to true to apply launch time to subsequent flights
   */
  same_start: boolean;
  /**
   * Solid color
   */
  solid_color: string;
  /**
   * Paraglider tail animation.
   * false if no tail (just icon)
   */
  anim_tail: boolean;
  /**
   * Paraglider tail length animation, in seconds.
   * -1 for infinite
   */
  anim_tail_duration: number;
  /**
   * Paraglider tail animation color
   */
  anim_tail_color: string;
  /**
   * Use Pilot name color for tail animation color
   */
  anim_tail_use_pilot_color: boolean;
  /**
   * Extrude section color
   */
  extrude_color: string;
  /**
   * Score flights
   */
  xc_score: boolean;
  /**
   * Scoring rules
   */
  xc_score_rules: string;
  /**
   * Max time to score flights in seconds
   */
  xc_score_maxtime: number;
  /**
   * Serialize KML to console after conversion
   */
  dbg_serialize: boolean;
}

export const defaultconfig: I2KConfiguration = {
  tz_offset: 0,
  pressure_altitude: false,
  qnh: SEALEVEL_QNH,
  same_start: false,
  solid_color: '#ff0000',
  anim_tail: true,
  anim_tail_duration: 60,
  anim_tail_color: '#ff9b00',
  anim_tail_use_pilot_color: true,
  extrude_color: '#000000',
  xc_score: true,
  xc_score_rules: 'FFVL',
  xc_score_maxtime: 10,
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

  convert(flights: Flight[], options: I2KConfiguration = defaultconfig, task?: Task | null, kml: boolean = false) {
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
      let timedelta = Math.trunc((this.bounds["time"].max - this.bounds["time"].min) / 3600);
      if (timedelta > 24) {
        throw new Error(`Invalid operation : more than 24 hours between flights (${timedelta} hours)`);
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

    return new Promise<ArrayBuffer|string>(res => {
      let kmz: KMZ = new KMZ();
      kmz.add_siblings([this.stock.kmz]);
      //TODO ROOTS result.add_roots()
      if (task) {
        kmz.add_siblings([Flight.make_task_folder(this, task)]);
      }
      Promise.all(flights.map(f => f.to_kmz(this))).then(kmzs => {
        kmz.add_siblings(kmzs);
      }).then(() => {
        if (kml) {
          kmz.get_data(2.1, true).then(res);
        }
        else {
          kmz.get_data(2.1, false, this.options.dbg_serialize).then(res);
        }
      });
    });
  }

  flights2kml(flights: Flight[], options: I2KConfiguration = defaultconfig, task?: Task | null): Promise<string> {
    return this.convert(flights, options, task) as Promise<string>;
  }

  flights2kmz(flights: Flight[], options: I2KConfiguration = defaultconfig, task?: Task | null): Promise<ArrayBuffer> {
    return this.convert(flights, options, task) as Promise<ArrayBuffer>;
  }
}
