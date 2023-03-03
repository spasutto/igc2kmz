
export class RGB {
  r: number = 0;
  g: number = 0;
  b: number = 0;
  constructor(r: number, g: number, b: number) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
  toHexString() {
    return ("0" + Math.trunc(255*this.b).toString(16)).substr(-2) + ("0" + Math.trunc(255*this.g).toString(16)).substr(-2) + ("0" + Math.trunc(255*this.r).toString(16)).substr(-2);//TODO trunc nécessaire?
  }
  toRGBString() {
    return `rgb(${Math.trunc(255*this.r)},${Math.trunc(255*this.g)},${Math.trunc(255*this.b)})`;
  }
}
export class RGBA extends RGB {
  a: number = 0;
  constructor(r: number, g: number, b: number, a: number) {
    super(r,g,b);
    this.a = a;
  }
  override toHexString() {
    return ("0" + Math.trunc(255*this.a).toString(16)).substr(-2) + super.toHexString();//TODO trunc nécessaire?
  }
  toRGBAString() {
    return `rgba(${Math.trunc(255*this.r)},${Math.trunc(255*this.g)},${Math.trunc(255*this.b)},${Math.trunc(255*this.a)})`;
  }
}

function h_to_value(p: number, q: number, t: number): number {
  if (t < 0) {
    t++;
  } else if (1 < t) {
    t--;
  }
  if (t < 1 / 6) {
    return p + 6 * (q - p) * t;
  } else if (t < 0.5) {
    return q;
  } else if (t < 2 / 3) {
    return p + 6 * (q - p) * (2 / 3 - t);
  } else {
    return p;
  }
}

function hsl_to_rgba(h: number, s: number, l: number, a: number = 1): RGBA {
  if (s == 0) {
    return new RGBA(1, 1, 1, a);
  }
  let q: number;
  if (l<0.5) {
    q = l * (s + 1);
  } else {
    q = l + s - l * s;
  }
  let p = 2.0 * l - q;
  let r = h_to_value(p, q, h + 1.0 / 3.0);
  let g = h_to_value(p, q, h);
  let b = h_to_value(p, q, h - 1.0 / 3.0);
  return new RGBA(r, g, b, a);
}

function hsv_to_rgb(h: number, s: number, v: number, a: number = 1): RGB {
  let hi = Math.trunc(h);
  let f = h - hi;
  let p = v * (1 - f);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);
  if (hi == 0) {
    return new RGB(v, t, p);
  } else if (hi == 1) {
    return new RGB(q, v, p);
  } else if (hi == 2) {
    return new RGB(p, v, t);
  } else if (hi == 3) {
    return new RGB(p, q, v);
  } else if (hi == 4) {
    return new RGB(t, p, v);
  } else {
    return new RGB(v, p, q);
  }
}

export type GradientCbk = (n: number) => RGBA;

/**
 * Return a gradient from black to white.
 * @param value
 * @returns
 */
export function grayscale_gradient(value: number): RGBA {
  let h: number;
  if (value < 0) {
    return new RGBA(0, 0, 0, 1);
  } else if (1 <= value) {
    return new RGBA(1, 1, 1, 1);
  } else {
    return new RGBA(value, value, value, 1);
  }
}

/**
 * Return a gradient from blue to green to red.
 * @param value
 * @returns
 */
export function default_gradient(value: number): RGBA {
  let h: number;
  if (value < 0) {
    return hsl_to_rgba(2 / 3, 1, 0.5);
  } else if (1 <= value) {
    return hsl_to_rgba(0, 1, 0.5);
  } else {
    h = 2 * (1 - value) / 3;
    return hsl_to_rgba(h, 1, 0.5);
  }
}

/**
 * Return a bilinear gradient from blue to green to red.
 * @param value
 * @returns
 */
export function bilinear_gradient(value: number): RGBA {
  let h: number;
  if (value < 0) {
    h = 2 / 3;
  } else if (value < 0.5) {
    h = (6 - 4 * value) / 9;
  } else if (value == 0.5) {
    h = 1 / 3;
  } else if (value < 1) {
    h = (4 - 4 * value) / 9;
  } else {
    h = 0;
  }
  return hsl_to_rgba(h, 1, 0.5);
}
