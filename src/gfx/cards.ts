/* Painted cards for the career hub (map, pro shop, school) and a few shared illustrations. Baked once per size. */
import { hi } from './hires.js';
import { view } from '../config.js';
import { hash2, shade, mixHex } from '../util.js';
import { charById } from '../data/characters.js';
import { LOCS } from '../data/locations.js';
import { STRIKERS, POWDERS, GRIPS } from '../data/items.js';
import { hallArt } from './halls.js';
import { mdiTrophy, mdiCog } from '@mdi/js';
import { strikerIcon, powderIcon, gripIcon } from './gearfx.js';

type C = CanvasRenderingContext2D;
const cache = new Map<string, HTMLCanvasElement>();
const lg = (c: C, x0: number, y0: number, x1: number, y1: number, st: [number, string][]) => { const g = c.createLinearGradient(x0, y0, x1, y1); st.forEach((s) => g.addColorStop(s[0], s[1])); return g; };
const rect = (c: C, x: number, y: number, w: number, h: number, f: string | CanvasGradient) => { c.fillStyle = f; c.fillRect(x, y, w, h); };
const circ = (c: C, x: number, y: number, r: number, f: string | CanvasGradient) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = f; c.fill(); };

export type CardKind = 'map' | 'shop' | 'school';
export function cardArt(kind: CardKind, w: number, h: number): HTMLCanvasElement {
  const key = `${kind}|${Math.round(w)}|${Math.round(h)}|${view.rs}`, hit = cache.get(key); if (hit) return hit;
  const { cv, ctx: c } = hi(w, h); c.save(); c.beginPath(); c.rect(0, 0, w, h); c.clip();
  if (kind === 'map') {
    rect(c, 0, 0, w, h, lg(c, 0, 0, 0, h, [[0, '#2a1850'], [0.45, '#c8505a'], [0.75, '#ffa24a'], [1, '#ffd88a']]));
    circ(c, w * 0.78, h * 0.5, h * 0.2, 'rgba(255,240,190,0.9)'); circ(c, w * 0.78, h * 0.5, h * 0.34, 'rgba(255,220,150,0.25)');
    for (let i = 0; i < 40; i++) circ(c, hash2(i, 1) * w, hash2(i, 2) * h * 0.4, 0.4 + hash2(i, 3) * 0.6, 'rgba(255,255,255,0.7)');
    c.fillStyle = '#1c0f2a'; c.beginPath(); c.moveTo(0, h); let sx0 = 0; while (sx0 < w) { const bw = 10 + hash2(sx0, 7) * 16, bh = h * (0.3 + hash2(sx0, 8) * 0.25); c.lineTo(sx0, h - bh); if (hash2(sx0, 9) > 0.5) { c.quadraticCurveTo(sx0 + bw / 2, h - bh - bw * 0.9, sx0 + bw, h - bh); } else c.lineTo(sx0 + bw, h - bh); sx0 += bw; } c.lineTo(w, h); c.closePath(); c.fill();
    // lanes and a winding path through the ten venues
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, h * (0.2 + i * 0.22)); c.bezierCurveTo(w * 0.3, h * (0.1 + i * 0.25), w * 0.6, h * (0.4 + i * 0.1), w, h * (0.15 + i * 0.25)); c.stroke(); }
    const pts = LOCS.map((_, i) => [w * (0.1 + 0.8 * ((i * 0.6180339) % 1)), h * (0.16 + 0.68 * (((i * 0.4142) + 0.2) % 1))]);
    c.setLineDash([3, 3]); c.strokeStyle = '#ffe27a'; c.lineWidth = 1.2; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); c.setLineDash([]);
    pts.forEach((p, i) => { const col = LOCS[i].accent; c.save(); c.shadowColor = col; c.shadowBlur = 5 * view.rs; circ(c, p[0], p[1], 6.2, '#2c1b0a'); circ(c, p[0], p[1], 5, col); c.restore(); });
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1; c.beginPath(); c.arc(w * 0.88, h * 0.82, h * 0.1, 0, 7); c.stroke(); c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(w * 0.88, h * 0.82 - h * 0.12); c.lineTo(w * 0.88 + 3, h * 0.82); c.lineTo(w * 0.88, h * 0.82 + 3); c.lineTo(w * 0.88 - 3, h * 0.82); c.fill();
  } else if (kind === 'shop') {
    rect(c, 0, 0, w, h, lg(c, 0, 0, 0, h, [[0, '#5a1a30'], [1, '#1c0a14']])); for (let x = 0, i = 0; x < w; x += 14, i++) { rect(c, x, 0, 14, h * 0.2, i & 1 ? '#f0e0c0' : '#c8302a'); c.fillStyle = i & 1 ? '#f0e0c0' : '#c8302a'; c.beginPath(); c.arc(x + 7, h * 0.2, 7, 0, Math.PI); c.fill(); } for (let i = 0; i < 12; i++) circ(c, hash2(i, 4) * w, h * 0.3 + hash2(i, 5) * h * 0.4, 6 + hash2(i, 6) * 10, 'rgba(255,200,120,0.06)');
    rect(c, 0, h * 0.7, w, h * 0.05, '#8a5a30'); rect(c, 0, h * 0.75, w, h * 0.25, '#3a2010');
    // a rack of striker discs on two shelves
    for (let i = 0; i < 4; i++) { c.drawImage(strikerIcon(STRIKERS[i * 2 % STRIKERS.length], 26), w * (0.1 + i * 0.1), h * 0.62 - 25); c.drawImage(strikerIcon(STRIKERS[(i * 2 + 1) % STRIKERS.length], 26), w * (0.1 + i * 0.1), h * 0.84 - 25); }
    rect(c, w * 0.08, h * 0.62, w * 0.44, h * 0.04, '#9a6a38'); rect(c, w * 0.08, h * 0.84, w * 0.44, h * 0.04, '#9a6a38');
    // shelf with chalk, gloves, powerups
    rect(c, w * 0.58, h * 0.5, w * 0.36, h * 0.04, '#9a6a38'); rect(c, w * 0.58, h * 0.78, w * 0.36, h * 0.04, '#9a6a38');
    for (let i = 0; i < 4; i++) c.drawImage(powderIcon(POWDERS[i + 1], 22), w * 0.6 + i * w * 0.085, h * 0.5 - 20); for (let i = 0; i < 4; i++) c.drawImage(gripIcon(GRIPS[i + 1], 24), w * 0.6 + i * w * 0.085, h * 0.78 - 22);
  } else {
    rect(c, 0, 0, w, h, '#6a4420'); rect(c, w * 0.04, h * 0.06, w * 0.92, h * 0.88, lg(c, 0, 0, w, h, [[0, '#1e3a4a'], [1, '#0e1e2c']])); for (let i = 0; i < 30; i++) circ(c, hash2(i, 1) * w, hash2(i, 2) * h, 6 + hash2(i, 3) * 14, 'rgba(255,255,255,0.025)'); c.strokeStyle = '#b8803c'; c.lineWidth = 4; c.strokeRect(w * 0.04, h * 0.06, w * 0.92, h * 0.88);
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.3; c.lineCap = 'round'; const bs = Math.min(w * 0.5, h * 0.62), tx = (w - bs) / 2, ty = h * 0.14; c.strokeRect(tx, ty, bs, bs);
    for (const [x, y] of [[tx, ty], [tx + bs, ty], [tx, ty + bs], [tx + bs, ty + bs]]) circ(c, x, y, 3.4, 'rgba(255,255,255,0.85)');
    c.beginPath(); c.arc(tx + bs / 2, ty + bs / 2, bs * 0.1, 0, 7); c.stroke(); c.beginPath(); c.moveTo(tx + bs * 0.2, ty + bs * 0.85); c.lineTo(tx + bs * 0.8, ty + bs * 0.85); c.stroke();
    circ(c, tx + bs * 0.38, ty + bs * 0.85, 3.6, '#ffffff'); circ(c, tx + bs * 0.62, ty + bs * 0.4, 3, '#2a2018'); circ(c, tx + bs * 0.5, ty + bs * 0.5, 3, '#ff5a62'); c.setLineDash([3, 3]); c.beginPath(); c.moveTo(tx + bs * 0.38, ty + bs * 0.85); c.lineTo(tx + bs * 0.6, ty + bs * 0.42); c.lineTo(tx + bs, ty); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#ffffff'; c.fillRect(w * 0.1, h * 0.84, w * 0.18, 2); c.fillStyle = '#ffd23a'; c.fillRect(w * 0.3, h * 0.83, w * 0.06, 4);
  }
  c.restore(); cache.set(key, cv); return cv;
}
export function clearCardCache() { cache.clear(); }
void shade;

/** title-screen card backgrounds (no text: the label goes on a translucent band at the bottom of the card) */
export type MenuKind = 'career' | 'quick' | 'tournament' | 'options';
export function menuCardArt(kind: MenuKind, w: number, h: number): HTMLCanvasElement {
  const key = `m|${kind}|${Math.round(w)}|${Math.round(h)}|${view.rs}`, hit = cache.get(key); if (hit) return hit;
  if (kind === 'career' || kind === 'quick') { const base = kind === 'career' ? cardArt('map', w, h) : hallArt(3, w, h); cache.set(key, base); return base; }
  const { cv, ctx: c } = hi(w, h); c.save(); c.beginPath(); c.rect(0, 0, w, h); c.clip();
  if (kind === 'tournament') {
    rect(c, 0, 0, w, h, lg(c, 0, 0, 0, h, [[0, '#523512'], [1, '#1d1307']])); const g = c.createRadialGradient(w / 2, h * 0.42, 4, w / 2, h * 0.42, h * 0.9); g.addColorStop(0, 'rgba(255,226,90,0.45)'); g.addColorStop(1, 'rgba(255,226,90,0)'); rect(c, 0, 0, w, h, g);
    c.strokeStyle = 'rgba(242,189,135,0.35)'; c.lineWidth = 1.2; for (const sx of [0.12, 0.88]) for (let i = 0; i < 4; i++) { const y = h * (0.16 + i * 0.17), x = w * sx, dx = sx < 0.5 ? 1 : -1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx * w * 0.08, y); c.lineTo(x + dx * w * 0.08, y + (i % 2 ? -1 : 1) * h * 0.085); c.lineTo(x + dx * w * 0.16, y + (i % 2 ? -1 : 1) * h * 0.085); c.stroke(); }
    const sz = h * 0.62; c.save(); c.translate(w / 2 - sz / 2, h * 0.46 - sz / 2 - 3); c.scale(sz / 24, sz / 24); const p = new Path2D(mdiTrophy); c.shadowColor = '#ffd23a'; c.shadowBlur = 10 * view.rs; c.fillStyle = lg(c, 0, 2, 0, 22, [[0, '#fff4a0'], [1, '#e0a010']]); c.fill(p); c.shadowBlur = 0; c.lineWidth = 0.5; c.strokeStyle = '#7a4a00'; c.stroke(p); c.restore();
  } else {
    rect(c, 0, 0, w, h, lg(c, 0, 0, w, h, [[0, '#613e18'], [1, '#1d1307']])); for (let i = 0; i < 12; i++) { c.fillStyle = `rgba(255,255,255,${0.02 + (i % 3) * 0.015})`; c.beginPath(); c.arc(w * ((i * 0.37) % 1), h * ((i * 0.61) % 1), 10 + i * 3, 0, 7); c.fill(); }
    const sz = h * 0.7; c.save(); c.translate(w / 2 - sz / 2, h * 0.46 - sz / 2 - 3); c.scale(sz / 24, sz / 24); const p = new Path2D(mdiCog); c.shadowColor = '#e1a569'; c.shadowBlur = 8 * view.rs; c.fillStyle = lg(c, 0, 2, 0, 22, [[0, '#fbecdc'], [1, '#c88a4a']]); c.fill(p); c.shadowBlur = 0; c.lineWidth = 0.4; c.strokeStyle = '#261809'; c.stroke(p); c.restore();
  }
  c.restore(); cache.set(key, cv); return cv;
}

const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
/** the PROFILE card backdrop: a lit stage in the colours of the chosen player, with carrom coins out of focus on both sides.
    The player is drawn over it (no backdrop of their own). */
export function profileCardArt(id: string, w: number, h: number): HTMLCanvasElement {
  const key = `p|${id}|${Math.round(w)}|${Math.round(h)}|${view.rs}`, hit = cache.get(key); if (hit) return hit;
  const [b0, b1] = charById(id).look.bg, { cv, ctx: c } = hi(w, h), gx = w / 2; c.save(); c.beginPath(); c.rect(0, 0, w, h); c.clip();
  rect(c, 0, 0, w, h, lg(c, 0, 0, w * 0.6, h, [[0, mixHex(b0, '#1d1307', 0.3)], [1, mixHex(b1, '#0f0903', 0.4)]]));
  c.save(); c.globalAlpha = 0.07; c.strokeStyle = '#ffffff'; c.lineWidth = 1; for (let x = -h; x < w + h; x += 9) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + h, 0); c.stroke(); } c.restore();
  for (let i = 0; i < 9; i++) circ(c, hash2(i, 11) * w, hash2(i, 12) * h * 0.55, 2.5 + hash2(i, 13) * 5, rgba(shade(b0, 0.6), 0.07 + hash2(i, 14) * 0.08));
  const pool = c.createRadialGradient(gx, h * 0.5, 2, gx, h * 0.5, h * 1.2); pool.addColorStop(0, rgba(shade(b0, 0.5), 0.7)); pool.addColorStop(0.55, rgba(b0, 0.25)); pool.addColorStop(1, rgba(b0, 0)); rect(c, 0, 0, w, h, pool);
  c.beginPath(); c.moveTo(gx - 7, 0); c.lineTo(gx + 7, 0); c.lineTo(gx + w * 0.3, h); c.lineTo(gx - w * 0.3, h); c.closePath(); c.fillStyle = lg(c, 0, 0, 0, h, [[0, 'rgba(255,255,255,0.3)'], [1, 'rgba(255,255,255,0.02)']]); c.fill();
  const ball = (x: number, y: number, r: number, col: string) => {
    const k = mixHex(col, b1, 0.1), g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r); g.addColorStop(0, shade(k, 0.55)); g.addColorStop(0.45, k); g.addColorStop(1, shade(k, -0.65));
    c.save(); c.globalAlpha = 0.85; circ(c, x, y, r, g); c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r * 0.72, 0, 7); c.stroke(); c.beginPath(); c.arc(x, y, r * 0.42, 0, 7); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(x - r * 0.36, y - r * 0.4, r * 0.28, r * 0.16, -0.6, 0, 7); c.fill(); c.restore();
  };
  ball(w * 0.1, h * 0.58, h * 0.24, '#ffd23a'); ball(w * 0.24, h * 0.9, h * 0.14, '#e03a3a'); ball(w * 0.04, h * 0.22, h * 0.11, '#3a78f0');
  ball(w * 0.91, h * 0.5, h * 0.25, '#d7914b'); ball(w * 0.77, h * 0.92, h * 0.13, '#ff8a2a'); ball(w * 0.96, h * 0.86, h * 0.12, '#a050e8');
  rect(c, 0, h * 0.72, w, h * 0.28, lg(c, 0, h * 0.72, 0, h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.4)']]));
  c.save(); c.translate(gx, h * 0.9); c.scale(1, 0.2); circ(c, 0, 0, w * 0.2, rgba(shade(b0, 0.5), 0.5)); c.restore();
  const vg = c.createRadialGradient(gx, h * 0.5, h * 0.35, gx, h * 0.5, w * 0.62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.38)'); rect(c, 0, 0, w, h, vg);
  c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1; c.strokeRect(2.5, 2.5, w - 5, h - 5);
  c.strokeStyle = rgba(shade(b0, 0.65), 0.8); c.lineWidth = 1.3; c.lineCap = 'round'; for (const [x, y, dx, dy] of [[5, 5, 1, 1], [w - 5, 5, -1, 1], [5, h - 5, 1, -1], [w - 5, h - 5, -1, -1]]) { c.beginPath(); c.moveTo(x + dx * 8, y); c.lineTo(x, y); c.lineTo(x, y + dy * 8); c.stroke(); }
  c.restore(); cache.set(key, cv); return cv;
}
