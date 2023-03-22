
import exifr from 'exifr';
import { Coord } from './coord';
import { RandomIdGenerator } from './util';

export class Photo {
  protected id: string;
  name: string;
  image: Buffer;
  date: Date;
  coord: Coord | null = null;
  elevation_data: boolean = false;
  description: string | null = null;

  constructor(name: string, image: Buffer, date: Date, coord: Coord | null = null, description: string | null = null) {
    this.id = 'img_' + RandomIdGenerator.makeid();
    this.name = name;
    this.image = image;
    this.date = date;
    this.coord = coord;
    this.elevation_data = !!coord;
    this.description = description;
  }
  get filename(): string {
    let ext = 'jpg';
    let idx = this.name.lastIndexOf('.');
    if (idx > -1) {
      ext = this.name.substring(idx + 1);
    }
    return 'images/' + this.id + '.' + ext;
  }
  to_html_img(): string {
    return `<img alt="${this.name}" src="${this.filename}" style="max-width:1024px"/>`;
  }

  static parse(name: string, image: Buffer) {
    name = name ?? 'image';
    name.replaceAll('\\', '/');
    let idx = name.lastIndexOf('/');
    if (idx > -1) {
      name = name.substring(idx + 1);
    }
    return new Promise<Photo>(res => {
      exifr.parse(image ?? name).then(exif => {
        let date = new Date(2000, 0, 1);
        let coord: Coord | undefined = undefined;
        let description: string | null = null;
        if (exif) {
          if (exif.DateTimeOriginal && typeof exif.DateTimeOriginal.getTime === 'function') {
            date = exif.DateTimeOriginal;
          } else if (exif.DateTime && typeof exif.DateTime.getTime === 'function') {
            date = exif.DateTime;
          }
          let latitude: number | null = null;
          if (typeof exif.latitude === 'number') {
            latitude = exif.latitude;
          } else if (Array.isArray(exif.GPSLatitude) && exif.GPSLatitude.length == 3) {
            latitude = exif.GPSLatitude[0] + exif.GPSLatitude[1] / 60 + exif.GPSLatitude[2] / (60 * 60);
          }
          let longitude: number | null = null;
          if (typeof exif.longitude === 'number') {
            longitude = exif.longitude;
          } else if (Array.isArray(exif.GPSLongitude) && exif.GPSLongitude.length == 3) {
            longitude = exif.GPSLongitude[0] + exif.GPSLongitude[1] / 60 + exif.GPSLongitude[2] / (60 * 60);
          }
          let altitude = (typeof exif.GPSAltitude === 'number') ? exif.GPSAltitude : undefined;
          if (latitude && longitude) {
            coord = Coord.deg(latitude, longitude, altitude);
          }
          if (typeof exif.UserComment === 'string') {
            description = exif.UserComment;
          }
        }
        let photo = new Photo(name, image, date, coord, description);
        res(photo);
      });
    });
  }
}
