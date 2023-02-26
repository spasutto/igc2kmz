
import { bilinear_gradient, default_gradient } from "./color";
import { Coord } from "./coord";
import { GoogleChart } from "./googlechart";
import { KML } from "./kml";
import { KMZ } from "./kmz";
import { Scale, TimeScale, ZeroCenteredScale } from "./scale";
import { Task } from "./task";
import { Track } from "./track";
import { BoundSet, bsupdate, OpenStruct, RandomIdGenerator, Slice, Utils } from "./util";

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
    if (track.elevation_data) {
      this.altitude_mode = 'absolute';
    } else {
      this.altitude_mode = 'clampToGround';
    }
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
    if (this.track.elevation_data) {
      rows.push(['Take-off altitude', this.track.coords[0].ele + 'm']);
      rows.push(['Maximum altitude', this.track.bounds["ele"]?.max + 'm']);
      rows.push(['Minimum altitude', this.track.bounds["ele"]?.min + 'm']);
      rows.push(['Landing altitude', this.track.coords[this.track.coords.length - 1].ele + 'm']);
      rows.push(['Total altitude gain', this.track.total_dz_positive + 'm']);
      rows.push(['Maximum altitude gain', this.track.max_dz_positive + 'm']);
      rows.push(['Maximum climb', Math.round(this.track.bounds["climb"]?.max * 10) / 10 + 'm/s']);
      rows.push(['Maximum sink', Math.round(this.track.bounds["climb"]?.min * 10) / 10 + 'm/s']);
    }
    rows.push(['Maximum speed', Math.round(this.track.bounds["speed"]?.max * 10) / 10 + 'km/h']);
    if (this.url) {
      let url = new URL(this.url);
      rows.push(['Flight URL', `<a href="${this.url}">${url.hostname}</a>`]);
    }
    let table = Utils.make_table(rows);
    return new KMZ([new KML.CDATA('description', table)]);
  }

  make_snippet(globals: FlightConvert): KMZ {
    //TODO
    return new KMZ([new KML.Snippet('A FAIRE')]);
  }

  make_task_folder(globals: FlightConvert, task: Task): KMZ {
    return new KMZ([new KML.CDATA('empty', 'TODO')]);
  }

  make_solid_track(globals: FlightConvert, style: KML.Style, altitude_mode: string, name: string, visibility: boolean|null = null, extrude: boolean = false): KMZ {
    let line_string = new KML.LineString(this.track.coords, altitude_mode);
    if (extrude) {
      line_string.add(new KML.SimpleElement('extrude', '1'));
    }
    let placemark = new KML.Placemark([style, line_string]);
    let style_url = globals.stock.check_hide_children_style.url;
    let folder = new KML.Folder(name, style_url, [placemark]);
    if (visibility != null) {
      folder.add(new KML.visibility(visibility));
    }
    return new KMZ([folder]);
  }

  make_colored_track(globals: FlightConvert, values: number[], scale: Scale | null, altitude_mode: string, visibility: boolean, scale_chart: boolean = true): KMZ {
    let folder = new KML.Folder('Colored by ' + scale?.title, globals.stock.check_hide_children_style.url, null, visibility);
    let styles = scale?.colors().map(c => new KML.Style([new KML.LineStyle(c.toHexString(), this.width.toString())])) ?? [];
    let discrete_values: number[] = values.map(v => scale?.discretize(v) ?? 0);
    let indexes = Utils.runs(discrete_values);
    for (let i = 0, sl = indexes[0]; i < indexes.length; i++, sl = indexes[i]) {
      let coordinates = this.track.coords.slice(sl.start, sl.stop + 1);
      let line_string = new KML.LineString(coordinates, altitude_mode); //TOFIX : pourquoi pas le param altitude_mode?
      let style_url = new KML.styleUrl(styles[discrete_values[sl.start]].url);
      let placemark = new KML.Placemark([style_url, line_string]);
      folder.add(placemark);
    }
    if (scale_chart) {
      let href = this.make_scale_chart(globals, scale).get_url();
      let icon = new KML.Icon([new KML.CDATA('href', href)]);
      let overlay_xy = new KML.overlayXY(0, 'fraction', 1, 'fraction');
      let screen_xy = new KML.screenXY(0, 'fraction', 1, 'fraction');
      let size = new KML.size(0, 'fraction', 0, 'fraction');
      let screen_overlay = new KML.ScreenOverlay([icon, overlay_xy, screen_xy, size]);
      folder.add(screen_overlay);
    }
    return new KMZ([folder]).add_roots(styles);
  }

  make_scale_chart(globals: FlightConvert, scale: Scale | null):GoogleChart {
    return new GoogleChart();//TODO
  }

  make_track_folder(globals: FlightConvert): KMZ {
    let style_url = globals.stock.radio_folder_style.url;
    let folder = new KMZ([new KML.Folder('Track', style_url, [], true)]);
    folder.add([globals.stock.invisible_none_folder]);
    let visibility: boolean;
    if (this.track.elevation_data) {
      visibility = globals.default_track == 'climb';
      folder.add([this.make_colored_track(globals, this.track.climb, globals.scales["climb"], 'absolute', visibility)]);
      visibility = globals.default_track == 'altitude';
      folder.add([this.make_colored_track(globals, this.track.ele, globals.scales["altitude"], 'absolute', visibility)]);
      visibility = globals.default_track == 'tec';
      folder.add([this.make_colored_track(globals, this.track.tec, globals.scales["tec"], 'absolute', visibility)]);
    }
    visibility = globals.default_track == 'speed';
    folder.add([this.make_colored_track(globals, this.track.speed, globals.scales["speed"], this.altitude_mode, visibility)]);
    // TODO
    /*if (this.track.bounds["tas"] != null) {
      visibility = globals.default_track == 'tas';
      folder.add([this.make_colored_track(globals, this.track.tas, globals.scales["tas"], this.altitude_mode, visibility)]);
    }*/
    visibility = globals.default_track == 'time';
    folder.add([this.make_colored_track(globals, this.track.t, globals.scales["t"], this.altitude_mode, visibility, false)]);
    visibility = globals.default_track == 'solid_color';
    let style = new KML.Style([new KML.LineStyle(this.color, this.width.toString())]);
    folder.add([this.make_solid_track(globals, style, this.altitude_mode, 'Solid color', visibility)]);
    return folder;
  }

  make_shadow_folder(globals: FlightConvert): KMZ {
    if (!this.track.elevation_data) {
      return new KMZ();
    }
    let style_url = globals.stock.radio_folder_style.url;
    let folder = new KMZ([new KML.Folder('Shadow', style_url, [], false)]);
    folder.add([globals.stock.invisible_none_folder]);
    let style = new KML.Style([new KML.LineStyle('ff000000', '1')]);
    folder.add([this.make_solid_track(globals, style, 'clampToGround', 'Normal')]);
    let line_style = new KML.LineStyle('00000000', '1');
    let poly_style = new KML.PolyStyle([new KML.SimpleElement('color', '80000000'), new KML.SimpleElement('width', '1')]);
    style = new KML.Style([line_style, poly_style]);
    folder.add([this.make_solid_track(globals, style, 'absolute', 'Extrude', false, true)]);
    style = new KML.Style([new KML.LineStyle(this.color, this.width.toString())]);
    folder.add([this.make_solid_track(globals, style, 'clampToGround', 'Solid color', false)]);
    return folder;
  }

  make_animation(globals: FlightConvert): KMZ {
    return new KMZ([new KML.CDATA('empty', 'TODO')]);
  }

  make_photos_folder(globals: FlightConvert): KMZ {
    return new KMZ([new KML.CDATA('empty', 'TODO')]);
  }

  make_xc_folder(globals: FlightConvert): KMZ {
    return new KMZ([new KML.CDATA('empty', 'TODO')]);
  }

  make_placemark(globals: FlightConvert, coord: Coord, altitudeMode: string, name: string, style_url: string): KML.Element {
    let point = new KML.Point(coord, altitudeMode);
    return new KML.Placemark([point, new KML.SimpleElement('name', name), new KML.Snippet(), new KML.styleUrl(style_url)])
  }

  make_altitude_marks_folder(globals: FlightConvert): KMZ {
    if (!this.track.elevation_data) {
      return new KMZ([]);
    }
    let style_url = globals.stock.check_hide_children_style.url;
    let folder = new KML.Folder('Altitude marks', style_url, [], null, false);
    Utils.salient2(this.track.coords.map(c => c.ele), [100, 50, 10]).forEach((j, index) => {
      let coord = this.track.coords[index];
      let i: number = globals.scales.altitude?.discretize(coord.ele) ?? 0;
      style_url = globals.altitude_styles[j][i].url;
      folder.add(this.make_placemark(globals, coord, 'absolute', `${coord.ele}m`, style_url));
    });
    return new KMZ([folder]);
  }

  make_graph(globals: FlightConvert, values: number[], scale?: Scale | null): KMZ {
    return new KMZ([new KML.CDATA('empty', 'TODO')]);
  }

  make_analysis_folder(globals: FlightConvert, title: string, slices: Slice[], style_url: string): KMZ {

    return new KMZ([new KML.CDATA('empty', 'TODO')]);
  }

  make_time_mark(globals: FlightConvert, coord: Coord, dt: Date, style_url: string): KML.Element {
    let point = new KML.Point(coord, this.altitude_mode);
    let name = new Date(dt.getTime() + globals.tz_offset * 1000).toISOString().substring(11, 16);
    return new KML.Placemark([point, new KML.SimpleElement('name', name), new KML.styleUrl(style_url)]);
  }

  make_time_marks_folder(globals: FlightConvert, step: number=300): KML.Folder {
    let style_url = globals.stock.check_hide_children_style.url;
    let folder = new KML.Folder('Time marks', style_url, [], null, false);
    let coord = this.track.coords[0];
    style_url = globals.stock.time_mark_styles[0].url;
    folder.add(this.make_time_mark(globals, coord, coord.dt, style_url));
    let dt = Utils.datetime_floor(this.track.coords[0].dt, step);
    while (dt <= this.track.coords[0].dt) {
      dt = new Date(dt.getTime() + step * 1000);
    }
    while (dt < this.track.coords[this.track.coords.length - 1].dt) {
      coord = this.track.coord_at(dt);
      let style_index = 3;
      if (dt.getMinutes() == 0) {
        style_index = 0;
      } else if (dt.getMinutes() == 30) {
        style_index = 1;
      } else if (dt.getMinutes() == 15 || dt.getMinutes() == 45) {
        style_index = 2;
      }
      style_url = globals.stock.time_mark_styles[style_index].url;
      folder.add(this.make_time_mark(globals, coord, dt, style_url));
      dt = new Date(dt.getTime() + step * 1000);
    }
    coord = this.track.coords[this.track.coords.length - 1];
    style_url = globals.stock.time_mark_styles[0].url;
    folder.add(this.make_time_mark(globals, coord, coord.dt, style_url));
    return folder;
  }

  to_kmz(globals: FlightConvert): KMZ {
    if (globals.scales["time"] != null) {
      this.time_positions = this.track.t.map(t => globals.graph_width * (t - globals.scales["time"]?.range.min) / (globals.scales["time"]?.range.max - globals.scales["time"]?.range.min));
    }
    let folder = new KMZ([new KML.Folder(this.track.filename, null, [], true)]);
    folder.add([this.make_description(globals)]);
    folder.add([this.make_snippet(globals)]);
    if (this.track.declaration) {
      folder.add([this.make_task_folder(globals, this.track.declaration)]);
    }
    folder.add([this.make_track_folder(globals)]);
    folder.add([this.make_shadow_folder(globals)]);
    folder.add([this.make_animation(globals)]);
    folder.add([this.make_photos_folder(globals)]);
    folder.add([this.make_xc_folder(globals)]);
    folder.add([this.make_altitude_marks_folder(globals)]);
    if (this.track.elevation_data) {
      let eles: number[] = this.track.coords.map(c => c.ele);
      folder.add([this.make_graph(globals, eles, globals.scales["altitude"])]);
    }
    folder.add([this.make_analysis_folder(globals, 'thermal', this.track.thermals, globals.stock.thermal_style.url)]);
    folder.add([this.make_analysis_folder(globals, 'glide', this.track.glides, globals.stock.glide_style.url)]);
    folder.add([this.make_analysis_folder(globals, 'dive', this.track.dives, globals.stock.dive_style.url)]);
    folder.add([this.make_time_marks_folder(globals)]);
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
    let line_style = new KML.LineStyle('ccff33ff', '2');
    this.xc_style = new KML.Style([balloon_style, icon_style, label_style, line_style]);
    this.kmz.add_root(this.xc_style);
    // #
    balloon_style = new KML.BalloonStyle([new KML.CDATA('text', '<h3>$[name]</h3>$[description]')]);
    icon_style = new KML.IconStyle([this.icons[0], new KML.SimpleElement('color', 'ccff33ff'), new KML.SimpleElement('scale', this.icon_scales[0].toString())]);
    label_style = new KML.LabelStyle([new KML.SimpleElement('color', 'ccff33ff')]);
    line_style = new KML.LineStyle('ccff33ff', '2');
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
    return new KML.Folder('None', style_url, [screen_overlay]);
  }

  make_analysis_style(color: string, bgcolors: string[], rows: string[][]): KML.Style {
    let text = '<h3>$[name]</h3>$[description]' + Utils.make_table(rows, bgcolors);
    let bg_color = 'ff' + [...bgcolors[1].substring(1).matchAll(/../g)].reverse().join('');
    let balloon_style = new KML.BalloonStyle([new KML.CDATA('text', text), new KML.SimpleElement('bgColor', bg_color)]);
    let icon_style = new KML.IconStyle([this.icons[0], new KML.SimpleElement('color', color), new KML.SimpleElement('scale', this.icon_scales[0].toString())]);
    let label_style = new KML.LabelStyle([new KML.SimpleElement('color', color), new KML.SimpleElement('scale', this.label_scales[0].toString())]);
    let line_style = new KML.LineStyle(color, '4');
    return new KML.Style([balloon_style, icon_style, label_style, line_style]);
  }
}

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
