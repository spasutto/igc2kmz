
export class Coord {
  lat: number;
  lon: number;
  ele: number;
  dt?: Date;

  constructor(lat: number, lon: number, ele: number, dt?: Date) {
    this.lat = lat;
    this.lon = lon;
    this.ele = ele ?? 0;
    this.dt = dt;
  }

  static deg(lat: number, lon: number, ele: number, dt?: Date): Coord {
    return new Coord(Math.PI*lat/180, Math.PI*lon/180, ele, dt)
  }
}
