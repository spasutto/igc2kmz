import { IGCFile, RecordExtensions, Task } from "igc-parser";
import { Coord } from "./coord";
import { Bounds, BoundSet, Utils, Slice } from "./util";

enum FlyingState {
  UNKNOWN = 0,
  THERMAL = 1,
  GLIDE = 2,
  DIVE = 3
}

export class Track {

  filename: string;
  flight: IGCFile;
  coords: Coord[];
  t: number[];
  pilot_name: string;
  glider_type: string;
  glider_id: string;
  bounds: BoundSet = {};
  elevation_data: boolean = false;
  s: number[] = [0];
  ele: number[] = [];
  total_dz_positive: number = 0;
  max_dz_positive: number = 0;
  min_ele: number = 0;
  speed: number[] = [];
  climb: number[] = [];
  tec: number[] = [];
  progress: number[] = [];
  thermals: Slice[] = [];
  glides: Slice[] = [];
  dives: Slice[] = [];
  declaration: Task | null = null;
  //extensions: Record<string, string[]> = {};
  constructor(flight: IGCFile, filename?: string) {
    this.flight = flight;
    this.filename = filename ?? ""; //TODO
    this.coords = Track.filter(flight.fixes.map(f => Coord.deg(f.latitude, f.longitude, (f.pressureAltitude ?? f.gpsAltitude) || 0, new Date(f.timestamp))));
    this.t = this.coords.map(c => c.dt.getTime() / 1000);
    this.pilot_name = flight.pilot || "";
    this.glider_type = flight.gliderType || "";
    this.glider_id = flight.registration || "";
    /*for (let i = 0; i < flight.fixes.length; i++) {
      for (const ext in flight.fixes[i].extensions) {
        if (this.extensions.hasOwnProperty(ext))
          this.extensions[ext].push(flight.fixes[i].extensions[ext]);
        else
          this.extensions[ext] = [flight.fixes[i].extensions[ext]];
      }
    }*/
    // TODO parse C records (propriété task à convertir dans propriété declaration)
    this.analyse(20);
  }

  static filter(coords: Coord[]): Coord[] {
    let result: Coord[] = [coords[0]];
    let last_c: Coord = coords[0];
    let c: Coord;
    for (let i = 0; i < coords.length; i++) {
      c = coords[i];
      if (c.dt <= last_c.dt)
        continue;
      let ds = last_c.distance_to(c);
      let dt = (c.dt.getTime() - last_c.dt.getTime()) / 1000;
      if (dt == 0 || ds / dt > 100)
        continue;
      let dz = c.ele - last_c.ele;
      if (dz / dt < -30 || 30 < dz / dt)
        continue;
      result.push(c);
      last_c = c;
    }

    return result;
  }

  analyse(dt: number) {
    let n = this.coords.length;
    let period = ((this.coords[n - 1].dt.getTime() - this.coords[0].dt.getTime()) / 1000) / n;
    if (dt < 2 * period)
      dt = 2 * period;
    this.bounds["ele"] = Bounds.createbounds(this.coords.map(c => c.ele));
    this.bounds["time"] = Bounds.createbounds([this.coords[0].dt, this.coords[n - 1].dt]);
    this.bounds["t"] = Bounds.createbounds([this.t[0], this.t[n - 1]]);
    this.bounds["tas"] = Bounds.createbounds(this.flight.fixes.filter(f => f.extensions.hasOwnProperty('TAS')).map(f => parseInt(f.extensions['TAS'])));
    if (this.bounds["ele"] && (this.bounds["ele"].min != 0 || this.bounds["ele"].max != 0))
      this.elevation_data = true;
    this.min_ele = this.coords[0].ele;
    let dz = 0;
    for (let i = 1; i < n; i++) {
      this.s.push(this.s[i - 1] + this.coords[i - 1].distance_to(this.coords[i]));
      this.ele.push((this.coords[i - 1].ele + this.coords[i - 1].ele) / 2);
      dz = this.coords[i].ele - this.coords[i - 1].ele;
      if (dz > 0) this.total_dz_positive += dz;
      if (this.coords[i].ele < this.min_ele)
        this.min_ele = this.coords[i].ele;
      else if (this.coords[i].ele - this.min_ele > this.max_dz_positive)
        this.max_dz_positive = this.coords[i].ele - this.min_ele;
    }
    let i0 = 0, i1 = 0, t0 = 0, t1 = 0, s0 = 0, s1 = 0, delta0 = 0, delta1 = 0, ds = 0, ds2 = 0, dp = 0, progress = 0;
    let coord0: Coord, coord1: Coord;
    for (let i = 1; i < n; i++) {
      t0 = (this.t[i - 1] + this.t[i]) / 2 - dt / 2;
      while (this.t[i0] <= t0) {
        i0++;
      }
      if (i0 == 0) {
        coord0 = this.coords[0];
        s0 = this.s[0];
      } else {
        delta0 = (t0 - this.t[i0 - 1]) / (this.t[i0] - this.t[i0 - 1]);
        coord0 = this.coords[i0 - 1].interpolate(this.coords[i0], delta0);
        s0 = (1 - delta0) * this.s[i0 - 1] + delta0 * this.s[i0];
      }
      t1 = t0 + dt;
      while (i1 < n && this.t[i1] < t1) {
        i1++;
      }
      if (i1 == n) {
        coord1 = this.coords[n - 1];
        s1 = this.s[n - 1];
      } else {
        delta1 = (t1 - this.t[i1 - 1]) / (this.t[i1] - this.t[i1 - 1]);
        coord1 = this.coords[i1 - 1].interpolate(this.coords[i1], delta1);
        s1 = (1 - delta1) * this.s[i1 - 1] + delta1 * this.s[i1];
      }
      ds = s1 - s0;
      ds2 = s1 * s1 - s0 * s0;
      dz = coord1.ele - coord0.ele;
      dp = coord0.distance_to(coord1);
      if (ds == 0) {
        progress = 0;
      } else if (dp > ds) {
        progress = 1;
      } else {
        progress = dp / ds;
      }
      this.speed.push(3.6 * ds / dt);
      this.climb.push(dz / dt);
      this.tec.push(dz / dt + ds2 / (2 * 9.80665));
      this.progress.push(progress);
    }
    this.bounds["speed"] = Bounds.createbounds(this.speed);
    this.bounds["climb"] = Bounds.createbounds(this.climb);
    this.bounds["tec"] = Bounds.createbounds(this.tec);
    let state: FlyingState[] = Array(n - 1).fill(FlyingState.UNKNOWN);
    let glide = this.progress.map(p => p >= 0.9);
    let sl: Slice;
    let indexes = Utils.condense(Utils.runs_where(glide), this.t, 60);
    for (let i = 0; i < indexes.length; i++) {
      sl = indexes[i];
      for (let j = sl.start; j < sl.stop; j++) {
        state[j] = FlyingState.GLIDE;
      }
    }
    let dive = Array.from(Array(n - 1)).map((v, i) => this.progress[i] < 0.9 && this.climb[i] < 1);
    indexes = Utils.condense(Utils.runs_where(dive), this.t, 30);
    for (let i = 0; i < indexes.length; i++) {
      sl = indexes[i];
      if (this.coords[sl.stop].ele - this.coords[sl.start].ele >= -100)
        continue;
      for (let j = sl.start; j < sl.stop; j++) {
        state[j] = FlyingState.DIVE;
      }
    }
    let thermal = Array.from(Array(n - 1)).map((v, i) =>
      (this.progress[i] < 0.9 && this.climb[i] > 0) ||
      (this.speed[i] < 10 && this.climb[i] > 0) ||
      this.climb[i] > 1);
    indexes = Utils.condense(Utils.runs_where(thermal), this.t, 60);
    for (let i = 0; i < indexes.length; i++) {
      sl = indexes[i];
      for (let j = sl.start; j < sl.stop; j++) {
        state[j] = FlyingState.THERMAL;
      }
    }
    indexes = Utils.runs(state);
    for (let i = 0; i < indexes.length; i++) {
      sl = indexes[i];
      dt = this.t[sl.stop] - this.t[sl.start];
      dz = this.coords[sl.stop].ele - this.coords[sl.start].ele;
      switch (state[sl.start]) {
        case FlyingState.THERMAL:
          if (dt >= 60 && dz > 50) {
            this.thermals.push(sl);
          }
          break;
        case FlyingState.DIVE:
          if (dt >= 30 && dz / dt < -2) {
            this.dives.push(sl);
          }
          break;
        case FlyingState.GLIDE:
          if (dt >= 120) {
            this.glides.push(sl);
          }
          break;
      }
    }
  }
}
