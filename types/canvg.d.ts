declare module "canvg" {
  type CanvgOptions = {
    ignoreMouse?: boolean;
    ignoreAnimation?: boolean;
    enableRedraw?: boolean;
  };

  export class Canvg {
    static from(
      ctx: CanvasRenderingContext2D,
      svg: string,
      options?: CanvgOptions,
    ): Promise<Canvg>;
    static fromString(
      ctx: CanvasRenderingContext2D,
      svg: string,
      options?: CanvgOptions,
    ): Canvg;
    ready(): Promise<void>;
    render(options?: CanvgOptions): Promise<void>;
    resize(width: number, height?: number, preserveAspectRatio?: boolean | string): void;
  }
}
