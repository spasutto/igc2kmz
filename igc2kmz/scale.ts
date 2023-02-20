import { Gradient, RGBA } from "./color";
import { Bounds } from "./util";

export class Scale {
  range: Bounds;
  title: string;
  gradient: Gradient;

  constructor(range: Bounds, title: string, gradient: Gradient) {
    this.range = range;
    this.title = title;
    this.gradient = gradient;
  }
}

export class ZeroCenteredScale extends Scale {

}

export class TimeScale extends Scale {

}