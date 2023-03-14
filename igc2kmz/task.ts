
import { decode, encode } from 'google-polyline';
import { Coord } from './coord';
import { Utils } from './util';
//import {XMLParser} from 'fast-xml-parser';

enum TP_TYPE {
  NONE,
  TAKEOFF,
  SSS,
  ESS
}

export class Turnpoint {
  name: string = '';
  description: string = '';
  type: TP_TYPE = TP_TYPE.NONE;
  coord: Coord;
  radius: number = 0;
  constructor(name: string | null, lat: number, lon: number, alt?:number) {
    this.name = name??''
    this.coord = Coord.deg(lat, lon, alt);
  }
}

export class Task {
  name: string | null = null;
  tps: Turnpoint[] = [];
  static loadTask(taskcontent: string): Task | null {
    /*const options = { ignoreAttributes: false };
    const parser = new XMLParser(options);
    let jsonObj = parser.parse('<root>value</root>');
    console.log(jsonObj);*/
    try {
      let to = JSON.parse(taskcontent);
      if (to.taskType == 'CLASSIC') {
        if (to.version == 1) {
          return new XCTrackTask(taskcontent);
        } else if (to.version == 2) {
          return new XCTrackTaskV2(taskcontent);
        }
      } else if (to.V == 2 && to.T == 'W') {
        return new XCTrackWaypointsTask(taskcontent);
      }
    } catch { }
    return null;
  }

  add_turnpoint(name: string | null, lat: number, lon: number, alt?:number): Turnpoint {
    let tp = new Turnpoint(name, lat, lon, alt);
    this.tps.push(tp);
    return tp;
  }
}

class XCTrackTask extends Task {
  constructor(taskcontent: string) {
    super();
    let task = JSON.parse(taskcontent);
    if (Array.isArray(task.turnpoints)) {
      task.turnpoints.forEach((t: any) => {
        if (typeof t.radius !== 'number' || typeof t.waypoint !== 'object') return;
        let tp = this.parse_waypoint(t.waypoint);
        if (tp) {
          tp.radius = t.radius;
          if (typeof t.type === 'string') {
            switch (t.type) {
              case 'SSS':
                tp.type = TP_TYPE.SSS;
                break;
              case 'ESS':
                tp.type = TP_TYPE.ESS;
                break;
              case 'TAKEOFF':
                tp.type = TP_TYPE.TAKEOFF;
                break;
              default:
                tp.type = TP_TYPE.NONE;
                break;
            }
          }
        }
      });
    }
    // TODO sss, goal, takeoff
  }

  parse_waypoint(wp: any): Turnpoint | null {
    if (typeof wp.name !== 'string' || typeof wp.lat !== 'number' || typeof wp.lon !== 'number' || typeof wp.altSmoothed !== 'number') return null;
    let tp = this.add_turnpoint(wp.name, wp.lat, wp.lon, wp.altSmoothed);
    if (tp && typeof wp.description === 'string') {
      tp.description = wp.description;
    }
    return tp;
  }
}

class XCTrackTaskV2 extends Task {
  constructor(taskcontent: string) {
    super();
    let task = JSON.parse(taskcontent);
    if (Array.isArray(task.t)) {
      task.t.forEach((t: any) => {
        if (typeof t.z !== 'string' || typeof t.n !== 'string') return;
        let pts = decode(t.z);
        if (pts.length <= 0) return;
        let tp = this.add_turnpoint(t.n, pts[0][1], pts[0][0]);
        if (pts.length > 1) {
          tp.radius = Coord.haversineDistance(pts[0], pts[1]);
        }
        if (tp && typeof t.d === 'string') {
          tp.description = t.d;
        }
      });
    }
    // TODO sss, goal, takeoff
  }
}

class XCTrackWaypointsTask extends Task {
  constructor(taskcontent: string) {
    super();
    let task = JSON.parse(taskcontent);
    if (Array.isArray(task.t)) {
      task.t.forEach((t: any) => {
        if (typeof t.z !== 'string' || typeof t.n !== 'string') return;
        decode(t.z).forEach(c => this.add_turnpoint(t.n, c[1], c[0]));
      });
    }
  }
}
