/* The last match frame, kept so the result screen can show the table dimmed behind its panel. */
let frame: HTMLCanvasElement | null = null;
export function grabFrame(src: HTMLCanvasElement) {
  try { frame = document.createElement('canvas'); frame.width = src.width; frame.height = src.height; frame.getContext('2d')!.drawImage(src, 0, 0); } catch { frame = null; }
}
export const lastFrame = () => frame;
