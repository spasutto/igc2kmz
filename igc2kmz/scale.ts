import { GradientCbk, RGBA } from "./color";
import { Bounds } from "./util";

export class Scale {
  range: Bounds;
  title: string;
  cbgradient: GradientCbk;
  gridstep: number = 0;
  step: number;

  constructor(range: Bounds, title: string, cbgradient: GradientCbk, step:number=1, max_divisions:number=16) {
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
          this.gridstep = 100 / (upper - lower);
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

}