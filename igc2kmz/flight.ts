
import { Coord } from "./coord";
import { Track } from "./track";
import { KML } from "./kml";
import { KMZ } from "./kmz";
import { Bounds, RandomIdGenerator, round, Slice, Utils, add_seconds } from "./util";
import { FlightConvert } from "./init";
import { Task, Turnpoint } from "./task";
import { Scale, TimeScale } from "./scale";
import { SimpleCanvas } from "./simplecanvas";
import { RGBA } from "./color";
import { Photo } from "./photo";

const RIGHTWARDS_ARROW = '->';
const INFINITY = 'inf';
const MULTIPLICATION_SIGN = 'x';
const UP_TACK = 'n/a';

export class Flight {
  track: Track;
  altitude_mode: string;
  color: string;
  width: number;
  pilot_name: string;
  glider_type: string;
  glider_id: string;
  photos: Photo[] = [];
  url: string = "";
  time_positions: number[] = [];
  root: KMZ;
  pcount: number = 0;
  protected id: string = '';
  endconv: ((value: KMZ) => void) | null = null;

  constructor(track: Track) {
    this.track = track;
    this.root = new KMZ([new KML.Folder(this.track.filename, null, [], true)]);
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

  get Id(): string {
    if ((this.id ?? "").trim().length > 0) {
      return this.id;
    }
    this.id = RandomIdGenerator.makeid(5);
    return this.id;
  }

  protected endwork() {
    this.pcount--;
    if (this.pcount <= 0 && this.endconv) {
      this.endconv(this.root);
    }
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
    let take_off_time = new Date((this.track.bounds["time"]?.min + globals.tz_offset) * 1000); //TOCHECK temps UTC
    rows.push(['Take-off time', take_off_time.toISOString().substring(11, 19)]);
    let landing_time = new Date((this.track.bounds["time"]?.max + globals.tz_offset) * 1000); //TOCHECK temps UTC
    rows.push(['Landing time', landing_time.toISOString().substring(11, 19)]);
    let duration = this.track.bounds["time"]?.max - this.track.bounds["time"]?.min;
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
    //TODO     if (this.xc)
    let date = new Date((this.track.bounds["time"]?.min + globals.tz_offset) * 1000);
    let strings = [this.pilot_name, date.toISOString().substring(0, 10)];
    return new KMZ([new KML.Snippet(strings.join(', '))]);
  }

  static make_task_folder(globals: FlightConvert, task: Task): KMZ {
    let name = task.name ?? 'Task';
    let rows = [];
    let tp0: Turnpoint | null = null;
    let total = 0;
    let count = -1;
    let indexes = Utils.runs(task.tps.map(tp => tp.name));
    for (let i = 0, sl = indexes[0]; i < indexes.length; i++, sl = indexes[i]) {
      if (!tp0) {
        tp0 = task.tps[sl.start];
        continue;
      }
      let tp1 = task.tps[sl.stop - 1];
      let distance = tp0.coord.distance_to(tp1.coord);
      let th = `${tp0.name} ${RIGHTWARDS_ARROW} ${tp1.name}`;
      let td = `${round(distance/1000, 1)}km`;
      rows.push([th, td]);
      total += distance;
      count++;
      tp0 = tp1;
    }
    rows.push(['Total', `${round(total/1000, 1)}km`]);
    let table = Utils.make_table(rows);
    let snippet = `${round(total/1000, 1)}km via ${count} turnpoints`;
    let style_url = globals.stock.check_hide_children_style.url;
    let folder = new KML.Folder(name, style_url, [new KML.CDATA('description', table), new KML.Snippet(snippet)]);
    let line_style = new KML.Style([new KML.LineStyle('cc00F5FF', '2')]);
    folder.add(line_style);
    style_url = globals.stock.xc_style.url;
    let done: string[] = [];
    for (let i=0, tp=task.tps[0]; i<task.tps.length; i++, tp=task.tps[i]) {
      let key = tp.name;
      if (done.indexOf(key) >= 0) continue;
      done.push(key);
      let point = new KML.Point(tp.coord);
      folder.add(new KML.Placemark(tp.name, point, [], style_url));
    }
    done = [];
    for (let i=0, tp=task.tps[0]; i<task.tps.length; i++, tp=task.tps[i]) {
      if (tp.radius == 0) continue;
      let key = tp.name+tp.radius.toString();
      if (done.indexOf(key) >= 0) continue;
      done.push(key);
      let coordinates = KML.coordinates.circle(tp.coord, tp.radius);
      let line_string = new KML.LineString(coordinates, null, true);
      folder.add(new KML.Placemark(null, line_string, [], style_url));
    }
    tp0 = null;
    indexes = Utils.runs(task.tps.map(tp => tp.name));
    for (let i = 0, sl = indexes[0]; i < indexes.length; i++, sl = indexes[i]) {
      if (!tp0) {
        tp0 = task.tps[sl.start];
        continue;
      }
      let tp1 = task.tps[sl.stop - 1];
      let coord0 = tp0.coord.coord_at(tp0.coord.initial_bearing_to(tp1.coord), tp0.radius);
      let theta = tp1.coord.initial_bearing_to(tp0.coord);
      let coord1 = tp1.coord.coord_at(theta, tp1.radius);
      let line_string1 = new KML.LineString([coord0, coord1], null, true);
      let coords = [coord1.coord_at(theta - Math.PI / 12, 400), coord1, coord1.coord_at(theta + Math.PI / 12, 400)];
      let line_string = new KML.LineString(coords, null, true);
      let multi_geometry = new KML.MultiGeometry([line_string1, line_string]);
      folder.add(new KML.Placemark(null, multi_geometry, [], line_style.url));
      tp0 = tp1;
    }
    return new KMZ([folder]);
  }

  make_solid_track(globals: FlightConvert, style: KML.Style, altitude_mode: string, name: string, visibility: boolean | null = null, extrude: boolean = false): KMZ {
    let line_string = new KML.LineString(this.track.coords, altitude_mode);
    if (extrude) {
      line_string.add(new KML.SimpleElement('extrude', '1'));
    }
    let placemark = new KML.Placemark(null, line_string, [style]);
    let style_url = globals.stock.check_hide_children_style.url;
    let folder = new KML.Folder(name, style_url, [placemark]);
    if (visibility != null) {
      folder.add(new KML.visibility(visibility));
    }
    return new KMZ([folder]);
  }

  make_colored_track(globals: FlightConvert, values: number[], scale: Scale | null, altitude_mode: string, visibility: boolean, scale_chart: boolean = true): KMZ {
    if (!scale) {
      return new KMZ();
    }
    let folder = new KML.Folder('Colored by ' + scale.title, globals.stock.check_hide_children_style.url, [], null, visibility);
    let styles = scale.colors().map(c => new KML.Style([new KML.LineStyle(c.toHexString(), this.width.toString())])) ?? [];
    let discrete_values: number[] = values.map(v => scale.discretize(v));
    let indexes = Utils.runs(discrete_values);
    for (let i = 0, sl = indexes[0]; i < indexes.length; i++, sl = indexes[i]) {
      let coordinates = this.track.coords.slice(sl.start, sl.stop + 1);
      let line_string = new KML.LineString(coordinates, altitude_mode); //TOFIX : pourquoi pas le param altitude_mode?
      let style_url = styles[discrete_values[sl.start]].url;
      let placemark = new KML.Placemark(null, line_string, [], style_url);
      folder.add(placemark);
    }
    let href = 'images/' + scale.title.replaceAll(' ', '_') + '_scale.png';
    if (scale_chart && scale && globals.canvas) {
      if (globals.files.indexOf(href) < 0) {
        globals.files.push(href);
        this.pcount++;
        this.make_scale_chart(globals, scale).then(imgdata => {
          this.root.add_file(href, imgdata);
          this.endwork();
        }).catch(e => {
          console.log(e);
          this.endwork();
        });
      }
      let icon = new KML.Icon([new KML.CDATA('href', href)]);
      let overlay_xy = new KML.overlayXY(0, 'fraction', 1, 'fraction');
      let screen_xy = new KML.screenXY(0, 'fraction', 1, 'fraction');
      let size = new KML.size(0, 'fraction', 0, 'fraction');
      let screen_overlay = new KML.ScreenOverlay([icon, overlay_xy, screen_xy, size]);
      folder.add(screen_overlay);
    }
    return new KMZ([folder]).add_roots(styles);
  }

  make_scale_chart(globals: FlightConvert, scale: Scale | null): Promise<string> {
    return new Promise((res, rej) => {
      if (!globals.canvas) return rej(('no canvas'));
      globals.canvas.create_canvas(50, 200).then(cv => {
        const ctx = cv.getContext('2d');
        if (!ctx || !scale) return rej(('no context'));
        ctx.clearRect(0, 0, cv.width, cv.height);

        ctx.fillStyle = "#ffffff00";
        ctx.fillRect(0, 0, cv.width, cv.height);
        let scalewidth = Math.max(Math.round(scale.range.max).toString().length, Math.round(scale.range.min).toString().length) * 9 + 2;
        ctx.fillStyle = "#ffffffcc";
        ctx.fillRect(0, 0, cv.width - scalewidth, cv.height);

        for (let i = 0; i < 32; i++) {
          let color = scale.color((i * (scale.range.max - scale.range.min) + 0.5) / 32 + scale.range.min)
          ctx.fillStyle = color.toRGBString();
          ctx.fillRect(0, (31 - i) * (cv.height / 32), cv.width - scalewidth, cv.height / 32);
        }
        ctx.strokeStyle = '#ff9f9f9f';
        ctx.fillStyle = '#fff';
        ctx.font = `12pt ${globals.canvas?.fontname}`;
        let nbrgraduations = cv.height / 25;
        for (let i = 0; i < nbrgraduations; i++) {
          let y = i * (cv.height / nbrgraduations);
          let value = Math.round((nbrgraduations - i) * (scale.range.max - scale.range.min) / nbrgraduations + scale.range.min).toString();
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(cv.width - scalewidth + 1, y);
          ctx.stroke();
          ctx.fillText(value, cv.width - scalewidth + 1, y);
        }
        //document.body.append(cv as HTMLCanvasElement);
        (globals.canvas as SimpleCanvas).get_base64(cv).then(v => res(v));
      });
    });
  }

  make_graph_chart(globals: FlightConvert, values: number[], scale: Scale | null): Promise<string> {
    return new Promise((res, rej) => {
      if (!globals.canvas) return rej(('no canvas'));
      globals.canvas.create_canvas(globals.graph_width, globals.graph_height).then(cv => {
        const ctx = cv.getContext('2d');
        let oldconsole = console.log; // TODO : voir pourquoi pureimage arrête pas de râler sur les tracés en double
        console.log = function () { };
        let timescale = globals.scales["time"] as TimeScale;
        if (!ctx || !(timescale instanceof TimeScale) || !scale) return rej(('no context'));
        ctx.clearRect(0, 0, cv.width, cv.height);

        ctx.fillStyle = "#ffffff00";
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = "#ffffffcc";
        let marginleft = 35;
        let marginbtm = 14;
        let grphw = globals.graph_width - marginleft;
        let grphh = globals.graph_height - marginbtm;
        ctx.fillRect(marginleft, 0, grphw, grphh);
        ctx.fillStyle = '#ffffffff';
        ctx.font = `12pt ${globals.canvas?.fontname} bold`;
        // axe horizontal (temps)   //timescale.positions == [3550, 3563, 3575, 3588, 0, 13, 25, 38, 50, 63, 75, 88]
        let increment = grphw / timescale.labels.length;
        for (let i = 0; i < timescale.labels.length; i++) {
          ctx.fillText(timescale.labels[i],marginleft + i * increment, cv.height - 1);
        }
        ctx.textAlign = "right";
        // axe vertical (altitude)
        increment = 50;
        while ((scale.range.max - scale.range.min) / increment > 10)
          increment += 50; //increment *= 2;
        let minalt = Utils.roundToFloor(scale.range.min, increment);
        let maxalt = Utils.roundToCeil(scale.range.max, increment);
        let multy = grphh / (maxalt - minalt);
        for (let i = minalt; i <= maxalt; i += increment) {
          ctx.fillText(i.toString(), marginleft-1, grphh - ((i - minalt)) * multy);
        }
        ctx.textAlign = "left";
        let yvals = values.map(v => grphh * (v - scale.range.min) / (scale.range.max - scale.range.min));
        let indexes = Utils.incr_douglas_peucker(this.time_positions, yvals, 1, 450);
        let cvalues = new Array(2);
        cvalues[0] = [];
        cvalues[1] = [];
        for (let i = 0; i < indexes.length; i++) {
          cvalues[0].push(this.track.t[indexes[i]]);
          cvalues[1].push(yvals[indexes[i]]);
        }
        let multx = grphw / (timescale.range.max - timescale.range.min);
        ctx.strokeStyle = '#FF9500';
        ctx.lineWidth = 2;
        let x = marginleft+ multx * (cvalues[0][0] - timescale.range.min);
        let y = grphh - cvalues[1][0];
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let i = 1; i < indexes.length; i++) {
          x = marginleft+multx * (cvalues[0][i] - timescale.range.min);
          y = grphh - cvalues[1][i];
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        console.log = oldconsole;
        //document.body.append(cv as HTMLCanvasElement);
        (globals.canvas as SimpleCanvas).get_base64(cv).then(v => res(v));
      });
    });
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

  make_animation_tour(globals: FlightConvert): KML.Element {
    let style_url = globals.stock.radio_folder_style.url;
    let result = new KML.Folder('Animation', style_url, [], false);
    let line_style = new KML.Style([new KML.LineStyle('bf00aaff', '2')]);
    result.add(line_style);
    let tour: KML.Tour = new KML.Tour('Double-click here to start tour', 1);
    result.add(tour);
    style_url = globals.stock.check_hide_children_style.url;
    let folder = new KML.Folder('Path segments', style_url, [], false);
    let placemarks: KML.Placemark[] = [];
    let line_string = new KML.LineString(this.track.coords.slice(0, 2), this.altitude_mode, true);
    let placemark = new KML.Placemark('1', line_string, [], line_style.url, false, false);
    placemarks.push(placemark);
    tour.add_update(placemark.Id);
    for (let i = 1; i < this.track.coords.length; i++) {
      //coord = this.track.coords[i - 1].halfway_to(this.track.coords[i]);
      line_string = new KML.LineString(this.track.coords.slice(i, i + 2), this.altitude_mode, true);
      placemark = new KML.Placemark(null, line_string, [], line_style.url, false, false);
      placemarks.push(placemark);
      tour.add_update(placemark.Id);
    }
    placemarks.forEach(placemark => folder.add(placemark));
    result.add(folder);
    return result;
  }

  make_animation(globals: FlightConvert): KMZ {
    let icon_style = new KML.IconStyle([globals.stock.animation_icon, new KML.color(this.color), new KML.scale(globals.stock.icon_scales[0].toString())]);
    let list_style = new KML.ListStyle('checkHideChildren');
    let line_color = RGBA.fromRGBAHexString(globals.options.anim_tail_color);
    if (!line_color) {
      line_color = new RGBA(0xff / 255, 0x9b / 255, 0x00 / 255, 0x9f / 255);
    }
    let line_style = new KML.LineStyle(line_color.toHexString(), this.width.toString());
    let label_color = new RGBA(Math.random(), Math.random(), Math.random(), 1);
    let label_style = new KML.LabelStyle(label_color, 1);
    let style = new KML.Style([icon_style, list_style, line_style, label_style]);
    let folder = new KML.Folder('Animation', null, [style], null, false);
    let point = new KML.Point(this.track.coords[0], this.altitude_mode);
    let timespan = new KML.TimeSpan(null, this.track.coords[0].dt);
    let placemark = new KML.Placemark(null, point, [timespan], style.url);
    folder.add(placemark);
    for (let i = 1; i < this.track.coords.length - 1; i++) {
      let coord = this.track.coords[i - 1].halfway_to(this.track.coords[i]);
      point = new KML.Point(coord, this.altitude_mode);
      timespan = new KML.TimeSpan(this.track.coords[i - 1].dt, this.track.coords[i].dt);
      placemark = new KML.Placemark(null, point, [timespan], style.url);
      if (globals.flights.length > 1) {
        placemark.add(new KML.SimpleElement('name', this.track.pilot_name));
      }
      folder.add(placemark);
      if (globals.options.anim_tail) {
        let line_string = new KML.LineString([this.track.coords[i - 1], this.track.coords[i]], 'absolute');
        let endtime: Date | null = null;
        if (globals.options.anim_tail_duration > 0) {
          endtime = new Date(this.track.coords[i].dt.getTime() + globals.options.anim_tail_duration * 1000);
        }
        timespan = new KML.TimeSpan(this.track.coords[i].dt, endtime);
        placemark = new KML.Placemark(null, line_string, [timespan], style.url);
        folder.add(placemark);
      }
    }
    point = new KML.Point(this.track.coords[this.track.coords.length - 1], this.altitude_mode);
    let line_string = new KML.LineString(this.track.coords.slice(this.track.indexOf(new Date(this.track.coords[this.track.coords.length - 1].dt.getTime() - 60000)), this.track.coords.length - 1), 'absolute');
    timespan = new KML.TimeSpan(this.track.coords[this.track.coords.length - 1].dt);
    placemark = new KML.Placemark(null, point, [timespan], style.url);
    folder.add(placemark);
    placemark = new KML.Placemark(null, line_string, [timespan], style.url);
    folder.add(placemark);
    return new KMZ([folder]);
  }

  make_photos_folder(globals: FlightConvert): KMZ {
    if (this.photos.length <= 0) {
      return new KMZ();
    }
    let folder = new KML.Folder('Photos', null, [], false);
    let photos = this.photos.sort((a, b) => b.date.getTime() - a.date.getTime());
    photos.forEach(photo => {
      let coord: Coord;
      let altitude_mode: string;
      if (photo.coord) {
        coord = photo.coord;
        altitude_mode = (photo.elevation_data) ? 'absolute' : 'clampToGround';
      } else {
        coord = this.track.coord_at(add_seconds(photo.date, -1 * globals.tz_offset));
        altitude_mode = this.altitude_mode;
      }
      let point = new KML.Point(coord, altitude_mode);
      let title = photo.name;
      if (photo.description?.trim().length ?? 0 > 0) {
        title += ': ' + photo.description;
      }
      let description = `<h3>${title}</h3>${photo.to_html_img()}`;
      let style_url = globals.stock.photo_style.url;
      let placemark = new KML.Placemark(photo.name, point, [new KML.CDATA('description', description), new KML.CDATA('Snippet', description)], style_url);
      folder.add(placemark);
    });
    return new KMZ([folder]);
  }

  make_xc_folder(globals: FlightConvert): KMZ {
    //TODO
    return new KMZ();
  }

  make_tour_folder(globals: FlightConvert): KML.Element {
    let style_url = globals.stock.check_hide_children_style.url;
    let folder = new KML.Folder('Tour', style_url, [], null, false);
    let dt = this.track.coords[0].dt;
    let delta = 15*60;//s (15 minutes)
    let coords:Coord[] = [];
    while (dt < this.track.coords[this.track.coords.length-1].dt) {
      coords.push(this.track.coord_at(dt));
      dt = add_seconds(dt, delta);
    }
    for (let i=0; i<coords.length; i++) {
      let j = (i + 1) % coords.length;
      let point = new KML.Point(coords[i], this.altitude_mode);
      let heading = coords[i].initial_bearing_to_deg(coords[j]);
      let camera = new KML.Camera(coords[i], heading, 75);
      let placemark = new KML.Placemark(null, point, [camera]);
      folder.add(placemark);
    }
    return folder;
  }

  make_placemark(globals: FlightConvert, coord: Coord, altitudeMode: string, name: string, style_url: string): KML.Element {
    let point = new KML.Point(coord, altitudeMode);
    return new KML.Placemark(name, point, [new KML.Snippet()], style_url);
  }

  make_altitude_marks_folder(globals: FlightConvert): KMZ {
    if (!this.track.elevation_data) {
      return new KMZ();
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

  make_graph(globals: FlightConvert, values: number[], scale: Scale): KML.Element {
    if (!globals.canvas) {
      return new KML.Comment('Error while generating graph');
    }
    let href = 'images/' + scale.title.replaceAll(' ', '_') + '_' + this.Id + '_graph.png';
    this.pcount++;
    this.make_graph_chart(globals, values, scale).then(imgdata => {
      this.root.add_file(href, imgdata);
      this.endwork();
    }).catch(e => {
      console.log(e);
      this.endwork();
    });
    /*if (!imgdata) {
      return new KML.Comment('Error while generating graph');
    }*/
    let icon = new KML.Icon([new KML.CDATA('href', href)]);
    let overlay_xy = new KML.overlayXY(0, 'fraction', 0, 'fraction');
    let screen_xy = new KML.screenXY(0, 'fraction', 16, 'pixels');
    let size = new KML.size(0, 'fraction', 0, 'fraction');
    let screen_overlay = new KML.ScreenOverlay([icon, overlay_xy, screen_xy, size]);
    let style_url = globals.stock.check_hide_children_style.url;
    let name = Utils.capitalizeFirstLetter(scale.title) + ' graph';
    let folder = new KML.Folder(name, style_url, [screen_overlay], null, false);
    return folder;
  }

  make_analysis_folder(globals: FlightConvert, title: string, slices: Slice[], style_url: string): KMZ {
    if (!this.track.elevation_data || slices.length <= 0) {
      return new KMZ();
    }
    let folder_style_url = globals.stock.check_hide_children_style.url
    let folder = new KML.Folder(Utils.capitalizeFirstLetter(title) + 's', folder_style_url, null, null, false);
    for (let k = 0, sl = slices[0]; k < slices.length; k++, sl = slices[k]) {
      let coord0 = this.track.coords[sl.start];
      let coord1 = this.track.coords[sl.stop];
      let coord = coord0.halfway_to(coord1);
      let point = new KML.Point(coord, 'absolute');
      let total_dz_positive = 0, total_dz_negative = 0;
      let peak_climb = new Bounds(0);
      for (let i = sl.start; i < sl.stop; i++) {
        let dz = this.track.coords[i + 1].ele - this.track.coords[i].ele;
        let dt = this.track.t[i + 1] - this.track.t[i];
        if (dz > 0) {
          total_dz_positive += dz;
        } else if (dz < 0) {
          total_dz_negative += dz;
        }
        peak_climb.update(dz / dt);
      }
      let climb = new Bounds(this.track.climb.slice(sl.start, sl.stop));
      let dz = this.track.coords[sl.stop].ele - this.track.coords[sl.start].ele;
      let dt = this.track.t[sl.stop] - this.track.t[sl.start];
      let dp = coord0.distance_to(coord1);
      let theta = coord0.initial_bearing_to(coord1);
      let dict: Record<string, string | number> = {};
      dict['altitude_change'] = round(dz);
      dict['average_climb'] = round(dz / dt, 1);
      dict['maximum_climb'] = round(climb.max, 1);
      dict['peak_climb'] = round(peak_climb.max, 1);
      let divisor = dt * climb.max;
      if (divisor == 0) {
        dict['efficiency'] = UP_TACK;
      } else {
        dict['efficiency'] = round(100.0 * dz / divisor);
      }
      dict['distance'] = round(dp / 1000.0, 1);
      let average_ld = dz < 0 ? round(-dp / dz, 1).toString() : INFINITY;
      dict['average_ld'] = average_ld;
      dict['average_speed'] = round(3.6 * dp / dt, 1);
      dict['maximum_descent'] = round(climb.min, 1);
      dict['peak_descent'] = round(peak_climb.min, 1);
      dict['start_altitude'] = coord0.ele;
      dict['finish_altitude'] = coord1.ele;
      let start_time = new Date(coord0.dt.getTime() + globals.tz_offset * 1000);
      dict['start_time'] = start_time.toISOString().substring(11, 19);
      let stop_time = new Date(coord1.dt.getTime() + globals.tz_offset * 1000);
      dict['finish_time'] = stop_time.toISOString().substring(11, 19);
      let duration = this.track.t[sl.stop] - this.track.t[sl.start];
      let seconds = ("0" + Math.trunc(duration % 60).toString()).substr(-2);
      dict['duration'] = `${Math.trunc(duration / 60)}m ${seconds}ds`;
      dict['accumulated_altitude_gain'] = total_dz_positive;
      dict['accumulated_altitude_loss'] = total_dz_negative;
      dict['drift_direction'] = Coord.rad_to_cardinal(theta + Math.PI);
      let extended_data = new KML.ExtendedData(dict);
      let name: string = '';
      if (title == 'thermal') {
        name = `${round(dz)}m at ${round(dz / dt, 1)}m/s`;
      } else if (title == 'glide') {
        name = `${round(dp / 1000, 1)}km at ${average_ld}:1, ${round(3.6 * dp / dt)}km/h`;
      } else if (title == 'dive') {
        name = `${-1 * round(-dz)}m at ${round(dz / dt, 1)}m/s`;
      }
      let placemark = new KML.Placemark(name, point, [extended_data], style_url);
      folder.add(placemark);
      let line_string = new KML.LineString([coord0, coord1], 'absolute');
      placemark = new KML.Placemark(null, line_string, null, style_url);
      folder.add(placemark);
    }
    return new KMZ([folder]);
  }

  make_time_mark(globals: FlightConvert, coord: Coord, dt: Date, style_url: string): KML.Element {
    let point = new KML.Point(coord, this.altitude_mode);
    let name = new Date(dt.getTime() + globals.tz_offset * 1000).toISOString().substring(11, 16);
    return new KML.Placemark(name, point, [], style_url);
  }

  make_time_marks_folder(globals: FlightConvert, step: number = 300): KML.Folder {
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

  to_kmz(globals: FlightConvert): Promise<KMZ> {
    return new Promise((res, rej) => {
      this.endconv = res;
      this.pcount++;
      if (globals.scales["time"] != null) {
        let maxtimescale = globals.scales["time"]?.range.max;
        let mintimescale = globals.scales["time"]?.range.min;
        this.time_positions = this.track.t.map(t => Math.trunc(globals.graph_width * (t - mintimescale) / (maxtimescale - mintimescale)));
      }
      this.root.add([this.make_description(globals)]);
      this.root.add([this.make_snippet(globals)]);
      if (this.track.declaration) {
        this.root.add([Flight.make_task_folder(globals, this.track.declaration)]);
      }
      this.root.add([this.make_track_folder(globals)]);
      this.root.add([this.make_shadow_folder(globals)]);
      this.root.add([this.make_animation(globals)]);
      //this.root.add([this.make_animation_tour(globals)]);
      //this.root.add([this.make_tour_folder(globals)]);
      this.root.add([this.make_photos_folder(globals)]);
      this.root.add([this.make_xc_folder(globals)]);
      this.root.add([this.make_altitude_marks_folder(globals)]);
      if (this.track.elevation_data && globals.scales["altitude"]) {
        let eles: number[] = this.track.coords.map(c => c.ele);
        this.root.add([this.make_graph(globals, eles, globals.scales["altitude"])]);
      }
      this.root.add([this.make_analysis_folder(globals, 'thermal', this.track.thermals, globals.stock.thermal_style.url)]);
      this.root.add([this.make_analysis_folder(globals, 'glide', this.track.glides, globals.stock.glide_style.url)]);
      this.root.add([this.make_analysis_folder(globals, 'dive', this.track.dives, globals.stock.dive_style.url)]);
      this.root.add([this.make_time_marks_folder(globals)]);
      this.photos.forEach(photo => this.root.add_file(photo.filename, photo.image));
      this.endwork();
    });
  }
}
