
import { KML } from "./kml";
import { KMZ, KMZResource } from "./kmz";
import { Utils } from "./util";

import icon_paraglider_src from '../assets/paraglider.png'
import icon_pixel_src from '../assets/pixel.png'

export class Stock {
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
    let list_style = new KML.ListStyle('radioFolder');
    this.radio_folder_style = new KML.Style([list_style]);
    this.kmz.add_root(this.radio_folder_style);
    // #
    list_style = new KML.ListStyle('checkHideChildren');
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
      let icon_style = new KML.IconStyle([this.icons[0], new KML.scale(this.icon_scales[i].toString())]);
      let label_style = new KML.LabelStyle('cc33ffff', this.label_scales[i]);
      this.time_mark_styles.push(new KML.Style([icon_style, label_style]));
    }
    this.kmz.add_roots(this.time_mark_styles);
    // #
    let balloon_style = new KML.BalloonStyle([new KML.CDATA('text', '$[description]')]);
    let icon_style = new KML.IconStyle([KML.Icon.palette(4, 46), new KML.scale(this.icon_scales[0].toString())]);
    let label_style = new KML.LabelStyle(undefined, this.label_scales[0]);
    this.photo_style = new KML.Style([balloon_style, icon_style, label_style]);
    this.kmz.add_root(this.photo_style);
    // #
    balloon_style = new KML.BalloonStyle([new KML.CDATA('text', '<h3>$[name]</h3>$[description]')]);
    icon_style = new KML.IconStyle([this.icons[0], new KML.SimpleElement('color', 'ccff33ff'), new KML.scale(this.icon_scales[0].toString())]);
    label_style = new KML.LabelStyle('ccff33ff', this.label_scales[0]);
    let line_style = new KML.LineStyle('ccff33ff', '2');
    this.xc_style = new KML.Style([balloon_style, icon_style, label_style, line_style]);
    this.kmz.add_root(this.xc_style);
    // #
    balloon_style = new KML.BalloonStyle([new KML.CDATA('text', '<h3>$[name]</h3>$[description]')]);
    icon_style = new KML.IconStyle([this.icons[0], new KML.SimpleElement('color', 'ccff33ff'), new KML.scale(this.icon_scales[0].toString())]);
    label_style = new KML.LabelStyle('ccff33ff');
    line_style = new KML.LineStyle('ccff33ff', '2');
    this.xc_style2 = new KML.Style([balloon_style, icon_style, label_style, line_style]);
    this.kmz.add_root(this.xc_style2);
    // #
    this.pixel_url = 'images/pixel.png';
    let pixel = icon_pixel_src.substring(icon_pixel_src.indexOf('base64,') + 'base64,'.length);
    this.kmz.add_file(this.pixel_url, pixel);
    // #
    this.visible_none_folder = this.make_none_folder(1);
    this.invisible_none_folder = this.make_none_folder(0);
    // #
    let animation_icon_url = 'images/paraglider.png';
    this.animation_icon = new KML.Icon([new KML.SimpleElement('href', animation_icon_url)]);
    let animation_icon = icon_paraglider_src.substring(icon_paraglider_src.indexOf('base64,') + 'base64,'.length);
    this.kmz.add_file(animation_icon_url, animation_icon);
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
    let icon_style = new KML.IconStyle([this.icons[0], new KML.SimpleElement('color', color), new KML.scale(this.icon_scales[0].toString())]);
    let label_style = new KML.LabelStyle(color, this.label_scales[0]);
    let line_style = new KML.LineStyle(color, '4');
    return new KML.Style([balloon_style, icon_style, label_style, line_style]);
  }
}
