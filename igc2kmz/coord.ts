
const R = 6371000;

export class Coord {
  lat: number;
  lon: number;
  ele: number;
  dt: Date;

  constructor(lat: number, lon: number, ele: number, dt?: Date) {
    this.lat = lat;
    this.lon = lon;
    this.ele = ele ?? 0;
    this.dt = dt ?? new Date();
  }

  static deg(lat: number, lon: number, ele: number, dt?: Date): Coord {
    return new Coord(Math.PI*lat/180, Math.PI*lon/180, ele, dt)
  }

  get lat_deg(): number {
    return 180 * this.lat / Math.PI;
  }

  get lon_deg(): number {
    return 180 * this.lon / Math.PI;
  }

  /**
   * Return the point halfway between self and other.
   * @param other
   */
  halfway_to(other: Coord): Coord {
    let bx = Math.cos(other.lat) * Math.cos(other.lon - this.lon);
    let by = Math.cos(other.lat) * Math.sin(other.lon - this.lon);
    let cos_lat_plus_bx = Math.cos(this.lat) + bx;
    let lat = Math.atan2(Math.sin(this.lat) + Math.sin(other.lat), Math.sqrt(cos_lat_plus_bx * cos_lat_plus_bx + by * by));
    let lon = this.lon + Math.atan2(by, cos_lat_plus_bx);
    let ele = (this.ele + other.ele) / 2;
    return new Coord(lat, lon, ele);
  }

  /**
   * Return the distance from self to other.
   * @param other
   * @returns
   */
  distance_to(other: Coord): number {
    let d: number = Math.sin(this.lat) * Math.sin(other.lat) + Math.cos(this.lat) * Math.cos(other.lat) * Math.cos(this.lon - other.lon);
    return d < 1 ? R * Math.acos(d) : 0;
  }

  /**
   * Return the point delta between self and other.
   * @param other
   * @param delta
   * @returns
   */
  interpolate(other: Coord, delta: number): Coord {
    let d: number = Math.sin(this.lat) * Math.sin(other.lat) + Math.cos(this.lat) * Math.cos(other.lat) * Math.cos(other.lon - this.lon);
    d = d < 1 ? delta * Math.acos(d) : 0;
    let y = Math.sin(other.lon - this.lon) * Math.cos(other.lat);
    let x = Math.cos(this.lat) * Math.sin(other.lat) - Math.sin(this.lat) * Math.cos(other.lat) * Math.cos(other.lon - this.lon);
    let theta = Math.atan2(y, x);
    let lat = Math.asin(Math.sin(this.lat) * Math.cos(d) + Math.cos(this.lat) * Math.sin(d) * Math.cos(theta));
    let lon = this.lon + Math.atan2(Math.sin(theta) * Math.sin(d) * Math.cos(this.lat), Math.cos(d) - Math.sin(this.lat) * Math.sin(lat));
    let ele = (1 - delta) * this.ele + delta * other.ele;
    return new Coord(lat, lon, ele);
  }

  /**
   * Return the point d from self in direction theta.
   * @param theta
   * @param d
   * @returns
   */
  coord_at(theta: number, d: number): Coord {
    let lat = Math.asin(Math.sin(this.lat) * Math.cos(d / R) + Math.cos(this.lat) * Math.sin(d / R) * Math.cos(theta));
    let lon = this.lon + Math.atan2(Math.sin(theta) * Math.sin(d / R) * Math.cos(this.lat), Math.cos(d / R) - Math.sin(this.lat) * Math.sin(this.lat));
    let ele = this.ele;
    return new Coord(lat, lon, ele);
  }
}
