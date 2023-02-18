export class OpenStruct {
  public a: string = "bonjour";
}

export class Bounds {
  min: any;
  max: any;
  constructor(value: any[] | any) {
    if (value instanceof Array) {
      if (value.length == 2) {
        this.min = value[0];
        this.max = value[1];
      } else {
        this.min = value[0];
        this.max = value[0];
        for (let i = 0; i < value.length; i++) {
          if (value[i] < this.min)
            this.min = value[i];
          if (value[i] > this.max)
            this.max = value[i];
        }
      }
    } else {
      this.min = value;
      this.max = value;
    }
  }

  update(value: Bounds | any) {
    if (value instanceof Bounds) {
      if (value.min < this.min)
        this.min = value.min;
      if (value.max > this.max)
        this.max = value.max;
    } else {
      if (value < this.min)
        this.min = value;
      if (value > this.max)
        this.max = value;
    }
  }

  tuple(): [any, any] {
    return [this.min, this.max];
  }
}

export type BoundSet = Record<string, Bounds>;
/*
export class BoundSet<T> {
  attr: Record<string, Bounds<T>> = {};
  update(other: BoundSet<T>) {
    let otherkeys = Object.keys(other.attr);
    for (let i = 0; i < otherkeys.length; i++) {
      let key = otherkeys[i];
      if (key in this.attr)
        this.attr[key].update(other.attr[key]);
      else
        this.attr[key] = new Bounds<T>(other.attr[key].tuple())
    }
  }
}
*/