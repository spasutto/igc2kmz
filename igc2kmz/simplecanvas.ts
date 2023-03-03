import { Bitmap } from "pureimage/types/bitmap";

export interface SimpleCanvas {
  create_canvas(width: number, height: number): HTMLCanvasElement | Bitmap;
  get_base64(): Promise<string>;
}
