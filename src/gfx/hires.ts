/* Hi-res canvases: baked assets are made at view.rs x their logical size and tagged with __lw / __lh, so a plain ctx.drawImage(cv, x, y)
   (no size) still draws them at the logical size. */
import { view } from "../config.js";
const proto = CanvasRenderingContext2D.prototype as any, orig = proto.drawImage;
if (!proto.__hires) {
  proto.__hires = true;
  proto.drawImage = function (img: any, ...a: number[]) { const L = img && img.__lw; if (L && a.length === 2) return orig.call(this, img, a[0], a[1], L, img.__lh); return orig.call(this, img, ...a); };
}
export interface Hi { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D }
/** a canvas of logical size lw x lh drawn in logical units (the context is pre-scaled) */
export function hi(lw: number, lh: number): Hi {
  const rs = view.rs, cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(lw * rs)); cv.height = Math.max(1, Math.ceil(lh * rs));
  const ctx = cv.getContext('2d')!; ctx.scale(rs, rs); tag(cv, lw, lh); return { cv, ctx };
}
export const lw = (c: HTMLCanvasElement) => (c as any).__lw ?? c.width;
export const lh = (c: HTMLCanvasElement) => (c as any).__lh ?? c.height;
export const tag = (c: HTMLCanvasElement, w: number, h: number) => { (c as any).__lw = w; (c as any).__lh = h; Object.defineProperty(c, 'width', { get: () => w, configurable: true }); Object.defineProperty(c, 'height', { get: () => h, configurable: true }); return c; };
