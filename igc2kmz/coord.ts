
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

  distance_to(other: Coord): number {
    let d: number = Math.sin(this.lat) * Math.sin(other.lat) + Math.cos(this.lat) * Math.cos(other.lat) * Math.cos(this.lon - other.lon);
    return d < 1 ? R * Math.acos(d) : 0;
  }
}
