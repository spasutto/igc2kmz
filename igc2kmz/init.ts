
import { bilinear_gradient, default_gradient } from "./color";
import { KML } from "./kml";
import { KMZ } from "./kmz";
import { Scale, TimeScale, ZeroCenteredScale } from "./scale";
import { Task } from "./task";
import { Track } from "./track";
import { BoundSet, bsupdate, OpenStruct, RandomIdGenerator, Utils } from "./util";

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
  time_positions: number[] = [];

  constructor(track: Track) {
    this.track = track;
    this.altitude_mode = "ff0000ff";
    this.color = "ff0000ff";
    this.width = 2;
    this.pilot_name = track.pilot_name;
    this.glider_type = track.glider_type;
    this.glider_id = track.glider_id;
  }

  make_description(globals: FlightConvert): KMZ {
    let rows = [];
    if (this.pilot_name) {
      rows.push(['Pilot name', this.pilot_name]);
    }
    if (this.glider_type) {
      rows.push(['Glider type', this.glider_type]);
    }
    if (this.glider_id) {
      rows.push(['Glider ID', this.glider_id]);
    }
    let take_off_time = new Date(this.track.bounds["time"]?.min.getTime() + globals.tz_offset * 1000); //TOCHECK temps UTC
    rows.push(['Take-off time', take_off_time.toISOString().substring(11, 19)]);
    let landing_time = new Date(this.track.bounds["time"]?.max.getTime() + globals.tz_offset * 1000); //TOCHECK temps UTC
    rows.push(['Landing time', landing_time.toISOString().substring(11, 19)]);
    let duration = (this.track.bounds["time"]?.max.getTime() - this.track.bounds["time"]?.min.getTime()) / 1000;
    let hour = Math.trunc(duration / 3600);
    let seconds = duration % 3600;
    let minute = Math.trunc(seconds / 60);
    let second = Math.trunc(seconds % 60);
    //("0" + hour.toString()).substr(-2)
    rows.push(['Duration', `${hour}h ${("0" + minute.toString()).substr(-2)}m ${("0" + second.toString()).substr(-2)}s`]);
    let table = Utils.make_table(rows);
    return new KMZ([new KML.CDATA('description', table)]);
  }

  to_kmz(globals: FlightConvert): KMZ {
    if (globals.scales["time"] != null) {
      this.time_positions = this.track.t.map(t => globals.graph_width * (t - globals.scales["time"]?.range.min) / (globals.scales["time"]?.range.max - globals.scales["time"]?.range.min));
    }
    let folder = new KMZ([new KML.Folder([new KML.SimpleElement('name', this.track.filename), new KML.open(true)])]);
    folder.add([this.make_description(globals)]);
    return folder;
  }
}

class Stock {
  kmz: KMZ;
  icons: KML.Icon[] = [];
  icon_scales: number[];
  label_scales: number[];
  radio_folder_style: KML.Style;
  check_hide_children_style: KML.Style;
  thermal_style: KML.Style;
  dive_style: KML.Style;
  glide_style: KML.Style;
  time_mark_styles: KML.Style[];
  photo_style: KML.Style;
  xc_style: KML.Style;
  xc_style2: KML.Style;
  pixel_url: string;
  visible_none_folder: KML.Folder;
  invisible_none_folder: KML.Folder;
  animation_icon: KML.Icon;

  constructor() {
    this.kmz = new KMZ();
    // #
    this.icons = [25, 25, 24, 24].map(v => KML.Icon.palette(4, v));
    this.icon_scales = [0.6, 0.5, 0.4, 0.3].map(v => Math.sqrt(v));
    this.label_scales = [0.6, 0.5, 0.4, 0.3].map(v => Math.sqrt(v));
    // #
    let list_style = new KML.ListStyle([new KML.SimpleElement('listItemType', 'radioFolder')]);
    this.radio_folder_style = new KML.Style([list_style]);
    this.kmz.add_root(this.radio_folder_style);
    // #
    list_style = new KML.ListStyle([new KML.SimpleElement('listItemType', 'checkHideChildren')]);
    this.check_hide_children_style = new KML.Style([list_style]);
    this.kmz.add_root(this.check_hide_children_style);
    // #
    let bgcolors = ['#ffcccc', '#ffdddd'];
    let rows = [
      ['Altitude gain', '$[altitude_change]m'],
      ['Average climb', '$[average_climb]m/s'],
      ['Maximum climb', '$[maximum_climb]m/s'],
      ['Peak climb', '$[peak_climb]m/s'],
      ['Efficiency', '$[efficiency]%'],
      ['Start altitude', '$[start_altitude]m'],
      ['Finish altitude', '$[finish_altitude]m'],
      ['Start time', '$[start_time]'],
      ['Finish time', '$[finish_time]'],
      ['Duration', '$[duration]'],
      ['Accumulated altitude gain', '$[accumulated_altitude_gain]m'],
      ['Accumulated altitude loss', '$[accumulated_altitude_loss]m'],
      ['Drift', '$[average_speed]km/h $[drift_direction]'],
    ];
    this.thermal_style = this.make_analysis_style('cc3333ff', bgcolors, rows);
    this.kmz.add_root(this.thermal_style);
    bgcolors = ['#ccccff', '#ddddff'];
    rows = [
      ['Altitude change', '$[altitude_change]m'],
      ['Average descent', '$[average_climb]m/s'],
      ['Maximum descent', '$[maximum_descent]m/s'],
      ['Peak descent', '$[peak_descent]m/s'],
      ['Start altitude', '$[start_altitude]m'],
      ['Finish altitude', '$[finish_altitude]m'],
      ['Start time', '$[start_time]'],
      ['Finish time', '$[finish_time]'],
      ['Duration', '$[duration]'],
      ['Accumulated altitude gain', '$[accumulated_altitude_gain]m'],
      ['Accumulated altitude loss', '$[accumulated_altitude_loss]m'],
    ];
    this.dive_style = this.make_analysis_style('ccff3333', bgcolors, rows);
    this.kmz.add_root(this.dive_style);
    bgcolors = ['#ccffcc', '#ddffdd'];
    rows = [
      ['Altitude change', '$[altitude_change]m'],
      ['Average descent', '$[average_climb]m/s'],
      ['Distance', '$[distance]km'],
      ['Average glide ratio', '$[average_ld]:1'],
      ['Average speed', '$[average_speed]km/h'],
      ['Start altitude', '$[start_altitude]m'],
      ['Finish altitude', '$[finish_altitude]m'],
      ['Start time', '$[start_time]'],
      ['Finish time', '$[finish_time]'],
      ['Duration', '$[duration]'],
      ['Accumulated altitude gain', '$[accumulated_altitude_gain]m'],
      ['Accumulated altitude loss', '$[accumulated_altitude_loss]m'],
    ];
    this.glide_style = this.make_analysis_style('cc33ff33', bgcolors, rows);
    this.kmz.add_root(this.glide_style);
    // #
    this.time_mark_styles = [];
    for (let i = 0; i < this.icons.length; i++) {
      let icon_style = new KML.IconStyle([this.icons[0], new KML.SimpleElement('scale', this.icon_scales[i].toString())]);
      let label_style = new KML.LabelStyle([new KML.SimpleElement('color', 'cc33ffff'), new KML.SimpleElement('scale', this.label_scales[i].toString())]);
      this.time_mark_styles.push(new KML.Style([icon_style, label_style]));
    }
    this.kmz.add_roots(this.time_mark_styles);
    // #
    let balloon_style = new KML.BalloonStyle([new KML.CDATA('text', '$[description]')]);
    let icon_style = new KML.IconStyle([KML.Icon.palette(4, 46), new KML.SimpleElement('scale', this.icon_scales[0].toString())]);
    let label_style = new KML.LabelStyle([new KML.SimpleElement('scale', this.label_scales[0].toString())]);
    this.photo_style = new KML.Style([balloon_style, icon_style, label_style]);
    this.kmz.add_root(this.photo_style);
    // #
    balloon_style = new KML.BalloonStyle([new KML.CDATA('text', '<h3>$[name]</h3>$[description]')]);
    icon_style = new KML.IconStyle([this.icons[0], new KML.SimpleElement('color', 'ccff33ff'), new KML.SimpleElement('scale', this.icon_scales[0].toString())]);
    label_style = new KML.LabelStyle([new KML.SimpleElement('color', 'ccff33ff'), new KML.SimpleElement('scale', this.label_scales[0].toString())]);
    let line_style = new KML.LineStyle([new KML.SimpleElement('color', 'ccff33ff'), new KML.SimpleElement('width', '2')]);
    this.xc_style = new KML.Style([balloon_style, icon_style, label_style, line_style]);
    this.kmz.add_root(this.xc_style);
    // #
    balloon_style = new KML.BalloonStyle([new KML.CDATA('text', '<h3>$[name]</h3>$[description]')]);
    icon_style = new KML.IconStyle([this.icons[0], new KML.SimpleElement('color', 'ccff33ff'), new KML.SimpleElement('scale', this.icon_scales[0].toString())]);
    label_style = new KML.LabelStyle([new KML.SimpleElement('color', 'ccff33ff')]);
    line_style = new KML.LineStyle([new KML.SimpleElement('color', 'ccff33ff'), new KML.SimpleElement('width', '2')]);
    this.xc_style2 = new KML.Style([balloon_style, icon_style, label_style, line_style]);
    this.kmz.add_root(this.xc_style2);
    // #
    this.pixel_url = 'images/pixel.png';
    // TODO chargment et ajout au zip de pixel_url
    // #
    this.visible_none_folder = this.make_none_folder(1);
    this.invisible_none_folder = this.make_none_folder(0);
    // #
    let animation_icon_url = 'images/paraglider.png';
    this.animation_icon = new KML.Icon([new KML.SimpleElement('href', animation_icon_url)]);
    // TODO chargment et ajout au zip de animation_icon_url
  }

  make_none_folder(visibility: number): KML.Folder {
    let icon = new KML.Icon([new KML.SimpleElement('href', this.pixel_url)]);
    let overlay_xy = new KML.overlayXY(0, 'fraction', 0, 'fraction');
    let screen_xy = new KML.screenXY(0, 'fraction', 0, 'fraction');
    let size = new KML.size(0, 'fraction', 0, 'fraction');
    let screen_overlay = new KML.ScreenOverlay([icon, overlay_xy, screen_xy, size, new KML.SimpleElement('visibility', visibility.toString())]);
    let style_url: string = this.check_hide_children_style.url;
    return new KML.Folder([screen_overlay, new KML.SimpleElement('name', 'None'), new KML.SimpleElement('styleUrl', style_url)]);
  }

  make_analysis_style(color: string, bgcolors: string[], rows: string[][]): KML.Style {
    let text = '<h3>$[name]</h3>$[description]' + Utils.make_table(rows, bgcolors);
    let bg_color = 'ff' + [...bgcolors[1].substring(1).matchAll(/../g)].reverse().join('');
    let balloon_style = new KML.BalloonStyle([new KML.CDATA('text', text), new KML.SimpleElement('bgColor', bg_color)]);
    let icon_style = new KML.IconStyle([this.icons[0], new KML.SimpleElement('color', color), new KML.SimpleElement('scale', this.icon_scales[0].toString())]);
    let label_style = new KML.LabelStyle([new KML.SimpleElement('color', color), new KML.SimpleElement('scale', this.label_scales[0].toString())]);
    let line_style = new KML.LineStyle([new KML.SimpleElement('color', color), new KML.SimpleElement('width', '4')]);
    return new KML.Style([balloon_style, icon_style, label_style, line_style]);
  }
}

export class FlightConvert {
  bounds: BoundSet = {};
  scales: OpenStruct<Scale> = {};
  stock: Stock = new Stock();
  task: Task|null = null;
  tz_offset: number = 0;
  altitude_styles: KML.Element[] = [];
  graph_width: number = 600;
  graph_height: number = 300;
  default_track: string = 'solid_color';

  flights2kmz(flights: Flight[], tz_offset: number = 0, task?: Task): KMZ | null {
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
          let icon_style = new KML.IconStyle([this.stock.icons[i], new KML.SimpleElement('color', c.toHexString()), new KML.SimpleElement('scale', this.stock.icon_scales[i].toString())]);
          let label_style = new KML.LabelStyle([new KML.SimpleElement('color', c.toHexString()), new KML.SimpleElement('scale', this.stock.label_scales[i].toString())]);
          altitude_styles.push(new KML.Style([ballon_style, icon_style, label_style]));
        }
        altitude_styles.forEach(s => this.altitude_styles.push(s));
      }
    }

    if (flights.length == 1) {
      if (flights[0].track.elevation_data) {
        this.default_track = 'climb';
      } else {
        this.default_track = 'speed';
      }
    }

    let result: KMZ = new KMZ();
    result.add_siblings([this.stock.kmz]);
    //TODO ROOTS result.add_roots()
    // TODO tasks
    flights.forEach(flight => {
      result.add_siblings([flight.to_kmz(this)]);
    })
    return result;

    //let kml: KML.KML = new KML.KML(this.altitude_styles);
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
    return new KMZ(kml);
    */
  }
}
