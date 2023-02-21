
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
}