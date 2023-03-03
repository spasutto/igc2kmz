import { Bitmap } from "pureimage/types/bitmap";

export interface SimpleCanvas {
  readonly fontname: string;
  create_canvas(width: number, height: number): Promise<HTMLCanvasElement | Bitmap>;
  get_base64(cv: HTMLCanvasElement | Bitmap): Promise<string>;
}
