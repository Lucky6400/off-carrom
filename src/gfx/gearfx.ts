/* Art for gear and power-ups: striker discs, grips (finger guards), powder tins and the power-up medallions. All vector, baked once. */
import type { StrikerDef, GripDef, PowderDef, PowerDef } from '../data/items.js';
import { hi } from './hires.js';
import { view } from '../config.js';
import { hash2, shade } from '../util.js';
import { coinSprite, lookOf } from './coins.js';
import { mdiEye, mdiFlash, mdiTarget, mdiMagnet, mdiWaves, mdiLightbulbOn, mdiUndoVariant, mdiStopCircle } from '@mdi/js';

type C = CanvasRenderingContext2D;
const lin = (c: C, x0: number, y0: number, x1: number, y1: number, st: [number, string][]) => { const g = c.createLinearGradient(x0, y0, x1, y1); st.forEach((s) => g.addColorStop(s[0], s[1])); return g; };
const cache = new Map<string, HTMLCanvasElement>();
const mkIcon = (key: string, w: number, h: number, paint: (c: C) => void): HTMLCanvasElement => { const k = key + view.rs; let r = cache.get(k); if (r) return r; const { cv, ctx } = hi(w, h); paint(ctx); cache.set(k, cv); return cv; };

/** a striker disc icon, s logical px wide */
export const strikerIcon = (d: StrikerDef, s = 40) => mkIcon('striker' + d.id + s, s, s, (c) => {
  const r = s * 0.4, sp = coinSprite(lookOf('classic', 0), r, d), n = r + 2.2;
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(s / 2 + r * 0.1, s / 2 + r * 0.3, r * 1.02, r * 0.9, 0, 0, 7); c.fill();
  c.drawImage(sp, s / 2 - n, s / 2 - n);
});
export const gripIcon = (g: GripDef, s = 40) => mkIcon('grip' + g.id + s, s, s, (c) => {
  c.scale(s / 40, s / 40); c.lineJoin = 'round'; const ol = '#1e1812';
  const body = lin(c, 0, 6, 0, 36, [[0, shade(g.col, 0.25)], [0.5, g.col], [1, g.col2]]);
  if (g.id === 'none') { c.fillStyle = '#e0b088'; } else c.fillStyle = body;
  const pal = new Path2D(); pal.roundRect(11, 18, 20, 16, 5); c.fill(pal); c.lineWidth = 1.6; c.strokeStyle = ol; c.stroke(pal);
  for (let i = 0; i < 4; i++) { const f = new Path2D(); f.roundRect(11 + i * 5.2, 6 + (i === 1 || i === 2 ? -2 : i === 3 ? 3 : 0), 4.8, 16, 2.4); c.fillStyle = g.id === 'none' ? '#e8b890' : lin(c, 0, 4, 0, 20, [[0, shade(g.col, 0.3)], [1, g.col]]); c.fill(f); c.stroke(f); }
  const th = new Path2D(); th.roundRect(5, 20, 11, 5, 2.5); c.fillStyle = g.id === 'none' ? '#e8b890' : g.col; c.save(); c.translate(8, 24); c.rotate(-0.7); c.translate(-8, -24); c.fill(th); c.stroke(th); c.restore();
  if (g.id !== 'none') { c.fillStyle = shade(g.col2, -0.1); c.fillRect(10, 31, 22, 5); c.strokeRect(10, 31, 22, 5); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(13, 33, 16, 1); c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.ellipse(17, 23, 4, 2, -0.3, 0, 7); c.fill(); }
});
/** a tin of board powder with a little puff */
export const powderIcon = (p: PowderDef, s = 40) => mkIcon('powder' + p.id + s, s, s, (c) => {
  c.scale(s / 40, s / 40); c.lineJoin = 'round'; const ol = '#1e1812', tin = '#c8903a';
  for (let i = 0; i < 12; i++) { c.fillStyle = `rgba(255,255,255,${0.2 + hash2(i, 3) * 0.3})`; c.beginPath(); c.arc(13 + hash2(i, 1) * 16, 7 + hash2(i, 2) * 6, 1.2 + hash2(i, 4) * 2, 0, 7); c.fill(); }
  c.fillStyle = lin(c, 8, 0, 32, 0, [[0, shade(tin, 0.3)], [0.5, tin], [1, shade(tin, -0.4)]]); c.fillRect(8, 16, 24, 18); c.beginPath(); c.ellipse(20, 34, 12, 3.6, 0, 0, 7); c.fill(); c.lineWidth = 1.4; c.strokeStyle = ol; c.stroke();
  c.fillStyle = p.col; c.fillRect(8, 21, 24, 8); c.strokeRect(8, 21, 24, 8); c.fillStyle = 'rgba(0,0,0,0.5)'; c.font = 'bold 5px Arial'; c.textAlign = 'center'; c.fillText('POWDER', 20, 27.4);
  c.beginPath(); c.ellipse(20, 16, 12, 3.6, 0, 0, 7); c.fillStyle = lin(c, 0, 12, 0, 20, [[0, shade(tin, 0.5)], [1, tin]]); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(20, 15.5, 8.5, 2.4, 0, 0, 7); c.fillStyle = p.col; c.fill();
});
const PGLYPH: Record<string, string> = { eagle: mdiEye, thunder: mdiFlash, steady: mdiTarget, magnet: mdiMagnet, glide: mdiWaves, protip: mdiLightbulbOn, rewind: mdiUndoVariant, sticky: mdiStopCircle };
export const powerIcon = (p: PowerDef, s = 30) => mkIcon('power' + p.id + s, s, s, (c) => {
  c.scale(s / 30, s / 30); const r = 14;
  c.save(); c.shadowColor = p.col; c.shadowBlur = 5 * view.rs; c.beginPath(); c.arc(15, 15, r, 0, 7); c.fillStyle = shade(p.col, 0.4); c.fill(); c.restore();
  const g = c.createRadialGradient(11, 9, 1, 15, 15, r); g.addColorStop(0, shade(p.col, 0.45)); g.addColorStop(0.55, p.col); g.addColorStop(1, p.col2); c.beginPath(); c.arc(15, 15, r - 1.2, 0, 7); c.fillStyle = g; c.fill();
  c.lineWidth = 1.2; c.strokeStyle = 'rgba(0,0,0,0.55)'; c.stroke();
  c.save(); c.translate(15, 15.5); c.scale(0.68, 0.68); c.translate(-12, -12); const pth = new Path2D(PGLYPH[p.id]); c.lineJoin = 'round'; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 2.4; c.stroke(pth); c.fillStyle = '#ffffff'; c.fill(pth); c.restore();
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(11, 8, 5, 2.6, -0.5, 0, 7); c.fill();
});
