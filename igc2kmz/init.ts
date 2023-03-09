
import { bilinear_gradient, default_gradient } from "./color";
import { KML } from "./kml";
import { KMZ } from "./kmz";
import { Scale, TimeScale, ZeroCenteredScale } from "./scale";
import { Flight } from "./flight";
import { Task } from "./task";
import { BoundSet, bsupdate, OpenStruct } from "./util";
import { Stock } from "./stock";

import { SimpleCanvas } from "./simplecanvas";

export class FlightConvert {
  bounds: BoundSet = {};
  scales: OpenStruct<Scale> = {};
  stock: Stock = new Stock();
  task: Task|null = null;
  tz_offset: number = 0;
  altitude_styles: KML.Element[][] = [];
  graph_width: number = 600;
  graph_height: number = 300;
  default_track: string = 'solid_color';
  canvas: SimpleCanvas | null = null;
  files: string[] = [];
  flights: Flight[] = [];

  constructor(canvas?: SimpleCanvas) {
    if (canvas) {
      this.canvas = canvas;
    }
  }

  flights2kmz(flights: Flight[], tz_offset: number = 0, task?: Task | null): Promise<ArrayBuffer> {
    this.flights = flights;
    //RandomIdGenerator.reset(); si on reset le generateur, il faut recréer stock
    flights.forEach(flight => {
      bsupdate(this.bounds, flight.track.bounds);
    });
    this.tz_offset = tz_offset * 3600;
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
      let result: KMZ = new KMZ();
      result.add_siblings([this.stock.kmz]);
      //TODO ROOTS result.add_roots()
      if (task) {
        result.add_siblings(Flight.make_task_folder(this, task));
      }
      Promise.all(flights.map(f => f.to_kmz(this))).then(kmzs => {
        result.add_siblings(kmzs);
      }).then(() => {
        result.get_data(2.2).then(res);
      });
    });
  }
}
