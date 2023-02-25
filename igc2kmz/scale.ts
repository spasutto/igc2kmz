import { default_gradient, GradientCbk, RGBA } from "./color";
import { Bounds, Utils } from "./util";

export class Scale {
  range: Bounds;
  title: string;
  cbgradient: GradientCbk;
  grid_step: number = 0;
  step: number;

  constructor(range: Bounds, title: string, step:number=1, cbgradient: GradientCbk = default_gradient, max_divisions:number=16) {
    this.range = range;
    this.title = title;
    this.cbgradient = cbgradient;
    this.step = step;
    if (step > 0) {
      let i = 0;
      let mult = step;
      while (true) {
        i = (++i) % 3 == 0 ? 0 : i;
        if (i == 1) {
          //"yield step<BR>";
          mult = step;
        } else if (i == 2) {
          //"yield 2*step<BR>";
          mult = 2 * step;
        } else {
          //"yield 5*step<BR>";
          //"step *= 10<BR>";
          mult = 5 * step;
          step *= 10;
        }
        let lower = Math.trunc(this.range.min / mult);
        let upper = Math.trunc(this.range.max / mult);
        if (this.range.min < mult * lower) {
          lower--;
        }
        if (this.range.max > mult * upper) {
          upper++;
        }
        if (upper - lower <= max_divisions) {
          this.grid_step = 100 / (upper - lower);
          this.range = new Bounds([mult * lower, mult * upper]);
          this.step = mult;
          break;
        }
      }
    }
  }

  normalize(value: number): number {
    if (value < this.range.min) {
      return 0;
    } else if (this.range.max <= value) {
      return 1;
    }
    return (value - this.range.min) / (this.range.max - this.range.min);
  }

  discretize(value: number, n: number = 32): number {
    if (value < this.range.min) {
      return 0;
    } else if (this.range.max <= value) {
      return n - 1;
    }
    let result = Math.trunc(n * this.normalize(value));
    return (result > n - 1) ? n - 1 : result;
  }

  color(value: number): RGBA {
    return this.cbgradient(this.normalize(value));
  }

  colors(n: number = 32): RGBA[] {
    return Array.from(Array(n - 1)).map((v, i) => this.cbgradient(i / (n - 1)));
  }
}

export class ZeroCenteredScale extends Scale {

}

export class TimeScale extends Scale {
  labels: string[] = [];
  positions:number[] = []
  constructor(range: Bounds, title: string, step: number = 1, cbgradient: GradientCbk = default_gradient, max_divisions: number = 16, tz_offset: number = 0) {
    // on passe 0 pour step pour éviter que le constructeur Scale fasse un boulot inutile
    super(range, title, 0, cbgradient, max_divisions);
    this.step = step;
    let lower: Date = range.min, upper: Date = range.max;
    if (step > 0) {
      //Array.from(Array(n - 1)).map((v, i) => this.progress[i] < 0.9 && this.climb[i] < 1);
      let steps: number[] = [1, 5, 15, 30, 60,
        5 * 60, 15 * 60, 30 * 60,
        3600, 3 * 3600, 6 * 3600, 12 * 3600].filter(s => s >= step);
      for (let i = 0, mult = steps[0]; i < steps.length; i++, mult = steps[i]) {
        lower = Utils.datetime_floor(range.min, mult);
        upper = Utils.datetime_floor(range.max, mult);
        if (upper < range.max) {
          // ajout de mult secondes
          upper = new Date(upper.getTime() + mult * 1000);
        }
        if ((upper.getTime() - lower.getTime()) / (mult * 1000) < max_divisions) {
          this.range = new Bounds([lower, upper]);
          this.grid_step = 100 * mult / ((upper.getTime() - lower.getTime()) / 1000);
          this.step = mult;
          break;
        }
      }
    }
    let t: Date = new Date((new Date(lower.getFullYear(), lower.getMonth(), lower.getDate(), lower.getHours(), 0)).getTime() + this.step * 1000);
    while (t < upper) {
      let labeltime = new Date(t.getTime() + tz_offset * 1000);
      this.labels.push(labeltime.toTimeString().split(' ')[0].substring(0, 5));
      // TODO voir pourquoi avec l'exemple flight.igc on a ces valeurs : [3550, 3563, 3575, 3588, 3600, 13, 25, 38, 50, 63, 75, 88]
      // et en python ['3550', '3562', '3575', '3588', '0', '12', '25', '38', '50', '62', '75', '88']
      this.positions.push(Math.round(100*Utils.datediffsecs(t, lower) / Utils.datediffsecs(upper, lower)));
      t = new Date(t.getTime() + (this.step * 1000));
    }
  }
}
