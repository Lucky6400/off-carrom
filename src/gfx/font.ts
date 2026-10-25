/* Text with real fonts (Bungee for headings, Rajdhani for small copy), baked at device resolution with a gradient fill, outline, slant and
   drop shadow. Same API as the old bitmap font: `y` is the top of the capital letters, `scale` multiplies the size. */
import { view } from '../config.js';
import { hi, tag } from './hires.js';

export interface TextOpts { scale?: number; color?: string; color2?: string; outline?: string | null; shadow?: string | null; bold?: boolean; slant?: number; spacing?: number; alpha?: number }
const cache = new Map<string, HTMLCanvasElement>();
const meas = document.createElement('canvas').getContext('2d')!;
const bung = (o: TextOpts) => !!o.bold || (o.scale ?? 1) >= 2;
const px = (o: TextOpts) => (bung(o) ? 9.4 : 10.6) * (o.scale ?? 1);
const fontOf = (o: TextOpts) => (bung(o) ? `400 ${px(o)}px Bungee, Impact, sans-serif` : `700 ${px(o)}px Rajdhani, 'Segoe UI', sans-serif`);
const cap = (o: TextOpts) => px(o) * (bung(o) ? 0.7 : 0.66);
const sp = (o: TextOpts) => (o.spacing ?? 0) * (o.scale ?? 1) + (bung(o) ? 0 : 0.35 * (o.scale ?? 1));

export function textWidth(s: string, o: TextOpts = {}): number { meas.font = fontOf(o); return meas.measureText(s).width + sp(o) * s.length; }
export function textHeight(o: TextOpts = {}) { return cap(o); }

function bake(s: string, o: TextOpts): HTMLCanvasElement {
  const sc = o.scale ?? 1, ol = o.outline === undefined ? '#000000' : o.outline, pad = (ol ? 1.4 * sc : 0) + (o.shadow ? 1.2 * sc : 0) + 1, w = textWidth(s, o) + (o.slant ?? 0) * cap(o) + pad * 2 + 2, h = cap(o) * 1.35 + pad * 2;
  const { cv, ctx } = hi(w, h); ctx.font = fontOf(o); ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  try { (ctx as any).letterSpacing = sp(o) + 'px'; } catch { /* unsupported */ }
  const base = pad + cap(o), x0 = pad + (o.slant ?? 0) * cap(o) * 0.5;
  if (o.slant) ctx.transform(1, 0, -(o.slant), 1, (o.slant) * base, 0);
  if (o.shadow) { ctx.fillStyle = o.shadow; ctx.strokeStyle = o.shadow; ctx.lineWidth = (ol ? 2.6 : 0.1) * sc; ctx.strokeText(s, x0 + 1.2 * sc, base + 1.4 * sc); ctx.fillText(s, x0 + 1.2 * sc, base + 1.4 * sc); }
  if (ol) { ctx.strokeStyle = ol; ctx.lineWidth = 2.6 * sc; ctx.strokeText(s, x0, base); }
  const c1 = o.color ?? '#ffffff', c2 = o.color2 ?? c1; if (c1 !== c2) { const g = ctx.createLinearGradient(0, base - cap(o), 0, base); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; } else ctx.fillStyle = c1;
  ctx.fillText(s, x0, base);
  (cv as any).__pad = pad; return tag(cv, w, h);
}
export function textCanvas(s: string, o: TextOpts = {}): HTMLCanvasElement {
  const k = s + '|' + view.rs + (o.scale ?? 1) + o.color + o.color2 + o.outline + o.shadow + o.bold + o.slant + o.spacing;
  let c = cache.get(k); if (!c) { c = bake(s, o); if (cache.size > 700) cache.clear(); cache.set(k, c); } return c;
}
export function clearTextCache() { cache.clear(); }
/** draw text; align 'l' | 'c' | 'r' relative to x. y is the top of the capitals. */
export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: TextOpts & { align?: 'l' | 'c' | 'r' } = {}) {
  if (!s) return; const cv = textCanvas(s, o), pad = (cv as any).__pad as number, w = textWidth(s, o);
  const ox = o.align === 'c' ? -w / 2 : o.align === 'r' ? -w : 0;
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ctx.drawImage(cv, x + ox - pad, y - pad); if (o.alpha !== undefined) ctx.globalAlpha = 1;
}
/** greedy word wrap into lines no wider than `maxW` */
export function wrap(s: string, maxW: number, o: TextOpts = {}): string[] {
  const out: string[] = []; let line = '';
  for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (textWidth(t, o) > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}

/** text baked at 1x (for stamping into low-res Pix art) */
export function textLo(s: string, o: TextOpts = {}): HTMLCanvasElement { const old = view.rs; view.rs = 1; try { return textCanvas(s, o); } finally { view.rs = old; } }
