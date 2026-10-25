/* Pixel painter: an RGBA buffer drawn with integer pixels, hard edges, banded dither gradients and glows, then turned into a canvas.
   Locations, props and sprites are all painted with this so they read as crisp low-resolution pixel art. */
import { hash2 } from '../util.js';

/** colours are packed 0xAABBGGRR (little-endian ImageData order) */
const cc = new Map<string, number>();
export function C(h: string, a = 255): number {
  const k = h + a; let v = cc.get(k); if (v !== undefined) return v;
  const n = parseInt(h.slice(1), 16); v = ((a << 24) | (((n >> 0) & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0; cc.set(k, v); return v;
}
export const unpack = (c: number): [number, number, number, number] => [c & 255, (c >> 8) & 255, (c >> 16) & 255, (c >>> 24) & 255];
export const pack = (r: number, g: number, b: number, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
export function mixC(a: number, b: number, t: number): number { const A = unpack(a), B = unpack(b); return pack(Math.round(A[0] + (B[0] - A[0]) * t), Math.round(A[1] + (B[1] - A[1]) * t), Math.round(A[2] + (B[2] - A[2]) * t), Math.round(A[3] + (B[3] - A[3]) * t)); }
export const lighten = (c: number, t: number) => mixC(c, pack(255, 255, 255, unpack(c)[3]), t);
export const darken = (c: number, t: number) => mixC(c, pack(0, 0, 0, unpack(c)[3]), t);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export class Pix {
  d: Uint32Array;
  constructor(public w: number, public h: number) { this.d = new Uint32Array(w * h); }
  set(x: number, y: number, c: number) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  get(x: number, y: number) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.d[y * this.w + x]; }
  /** alpha blend a colour over what is there */
  blend(x: number, y: number, c: number, alpha = 1) {
    x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x, o = this.d[i], s = unpack(c), a = (s[3] / 255) * alpha; if (a <= 0) return;
    if (o >>> 24 === 0) { this.d[i] = pack(s[0], s[1], s[2], Math.round(a * 255)); return; }
    const D = unpack(o); this.d[i] = pack(Math.round(D[0] + (s[0] - D[0]) * a), Math.round(D[1] + (s[1] - D[1]) * a), Math.round(D[2] + (s[2] - D[2]) * a), Math.max(D[3], Math.round(a * 255)));
  }
  fill(c: number) { this.d.fill(c); }
  rect(x: number, y: number, w: number, h: number, c: number) {
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y)), x1 = Math.min(this.w, Math.round(x + w)), y1 = Math.min(this.h, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) { const o = yy * this.w; for (let xx = x0; xx < x1; xx++) this.d[o + xx] = c; }
  }
  /** blend a translucent rect */
  tint(x: number, y: number, w: number, h: number, c: number, alpha: number) { for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) this.blend(xx, yy, c, alpha); }
  /** vertical gradient built from flat bands with a 4x4 ordered dither between neighbouring bands */
  vgrad(x: number, y: number, w: number, h: number, c0: number, c1: number, _bands = 8) {
    for (let yy = 0; yy < h; yy++) { const c = mixC(c0, c1, yy / Math.max(1, h - 1)); for (let xx = 0; xx < w; xx++) this.set(x + xx, y + yy, c); }
  }
  hgrad(x: number, y: number, w: number, h: number, c0: number, c1: number, _bands = 8) {
    for (let xx = 0; xx < w; xx++) { const c = mixC(c0, c1, xx / Math.max(1, w - 1)); for (let yy = 0; yy < h; yy++) this.set(x + xx, y + yy, c); }
  }
  hline(x: number, y: number, w: number, c: number) { this.rect(x, y, w, 1, c); }
  vline(x: number, y: number, h: number, c: number) { this.rect(x, y, 1, h, c); }
  line(x0: number, y0: number, x1: number, y1: number, c: number) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (;;) { this.set(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  /** scanline polygon fill; `c` may be a function of the pixel for shading */
  poly(pts: [number, number][], c: number | ((x: number, y: number) => number)) {
    let y0 = 1e9, y1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.ceil(y0 - 0.5); y <= Math.floor(y1 - 0.5); y++) {
      const yc = y + 0.5, xs: number[] = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const xl = Math.ceil(xs[k] - 0.5), xr = Math.ceil(xs[k + 1] - 0.5) - 1; for (let x = xl; x <= xr; x++) { const v = typeof c === 'number' ? c : c(x, y); if (v) this.set(x, y, v); } }
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number | ((x: number, y: number) => number)) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const t = (y + 0.5 - cy) / ry; if (Math.abs(t) > 1) continue; const hw = rx * Math.sqrt(1 - t * t), xl = Math.ceil(cx - hw - 0.5), xr = Math.ceil(cx + hw - 0.5) - 1;
      for (let x = xl; x <= xr; x++) this.set(x, y, typeof c === 'number' ? c : c(x, y));
    }
  }
  disc(cx: number, cy: number, r: number, c: number | ((x: number, y: number) => number)) { this.ellipse(cx, cy, r, r, c); }
  /** additive-looking dithered glow: a stipple that thins out with distance */
  glow(cx: number, cy: number, r: number, c: number, strength = 0.6) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x - cx, y - cy) / r; if (d >= 1) continue; const a = (1 - d) * (1 - d) * strength;
      this.blend(x, y, c, Math.min(1, a * 0.9));
    }
  }
  /** soft (non-dithered) glow for sprites that are drawn smoothly */
  halo(cx: number, cy: number, r: number, c: number, strength = 0.5) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const d = Math.hypot(x - cx, y - cy) / r; if (d < 1) this.blend(x, y, c, (1 - d) * (1 - d) * strength); }
  }
  /** 1 px dark outline around everything painted (only on transparent pixels) */
  outline(c: number, diag = false) {
    const src = this.d.slice(), w = this.w, h = this.h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (src[y * w + x] >>> 24) continue;
      const n = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < w && yy < h && src[yy * w + xx] >>> 24 > 0;
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1) || (diag && (n(x - 1, y - 1) || n(x + 1, y - 1) || n(x - 1, y + 1) || n(x + 1, y + 1)))) this.d[y * w + x] = c;
    }
  }
  /** stamp another Pix (alpha > 0 pixels only) */
  blit(src: Pix, x: number, y: number, flip = false) {
    for (let yy = 0; yy < src.h; yy++) for (let xx = 0; xx < src.w; xx++) { const v = src.d[yy * src.w + xx]; if (v >>> 24) this.set(x + (flip ? src.w - 1 - xx : xx), y + yy, v); }
  }
  /** scatter of single pixels (stars, sparkles) */
  scatter(x: number, y: number, w: number, h: number, count: number, seed: number, cols: number[]) {
    for (let i = 0; i < count; i++) this.set(x + hash2(i, seed) * w, y + hash2(i, seed + 7) * h, cols[Math.floor(hash2(i, seed + 13) * cols.length)]);
  }
  toCanvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d')!, img = ctx.createImageData(this.w, this.h); new Uint32Array(img.data.buffer).set(this.d); ctx.putImageData(img, 0, 0); return cv;
  }
  static fromCanvas(cv: HTMLCanvasElement): Pix {
    const p = new Pix(cv.width, cv.height), img = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height); p.d.set(new Uint32Array(img.data.buffer)); return p;
  }
}

export const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
/** hard alpha: removes the soft anti-aliased edge of canvas vector drawing so the sprite is crisp, optionally adding an outline */
export function crisp(cv: HTMLCanvasElement, outline: string | null = null, thresh = 128): HTMLCanvasElement {
  const p = Pix.fromCanvas(cv);
  for (let i = 0; i < p.d.length; i++) { const a = p.d[i] >>> 24; if (a < thresh) p.d[i] = 0; else p.d[i] = (p.d[i] & 0x00ffffff) | 0xff000000; }
  if (outline) { const o = new Pix(p.w + 2, p.h + 2); o.blit(p, 1, 1); o.outline(C(outline)); return o.toCanvas(); }
  return p.toCanvas();
}
