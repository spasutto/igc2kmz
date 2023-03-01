
interface CanvasFactory {
  create_canvas(width: number, height: number): void;
  get_base64(): string;
}
