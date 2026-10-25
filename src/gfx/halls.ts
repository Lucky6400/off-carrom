/* The ten carrom venues as hi-res vector illustrations (menus, map cards, title) plus the top-down floors the match is played on.
   Every hall is painted in a fixed 427 x 240 design box (cover-cropped into whatever size is asked for) with a shared toolkit: perspective floor,
   a 3/4 view carrom board with a hanging lamp, wall painters and props per venue. Everything is cached per size. */
import { LOCS, type FloorKind, type LocDef } from '../data/locations.js';
import { view } from '../config.js';
import { hi } from './hires.js';
import { hash2, shade, mixHex } from '../util.js';

type C = CanvasRenderingContext2D;
const DW = 427, DH = 240, HZ = 112; // design box and the wall / floor horizon
const hexA = (h: string, a: number) => { if (h.startsWith('rgba')) return h; const v = parseInt(h.slice(1), 16); return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`; };
const lg = (c: C, x0: number, y0: number, x1: number, y1: number, st: [number, string][]) => { const g = c.createLinearGradient(x0, y0, x1, y1); st.forEach((s) => g.addColorStop(s[0], s[1])); return g; };
const rg = (c: C, x: number, y: number, r0: number, r1: number, st: [number, string][]) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); st.forEach((s) => g.addColorStop(s[0], s[1])); return g; };
const rect = (c: C, x: number, y: number, w: number, h: number, f: string | CanvasGradient) => { c.fillStyle = f; c.fillRect(x, y, w, h); };
const rrect = (c: C, x: number, y: number, w: number, h: number, r: number, f: string | CanvasGradient) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = f; c.fill(); };
const circ = (c: C, x: number, y: number, r: number, f: string | CanvasGradient) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = f; c.fill(); };
const poly = (c: C, pts: number[][], f: string | CanvasGradient, line?: string, lw = 0.8) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = f; c.fill(); if (line) { c.strokeStyle = line; c.lineWidth = lw; c.stroke(); } };
const glow = (c: C, x: number, y: number, r: number, col: string, a = 0.5) => circ(c, x, y, r, rg(c, x, y, 0, r, [[0, hexA(col, a)], [1, hexA(col, 0)]]));
function neon(c: C, col: string, lw: number, path: () => void, blur = 7) { c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.shadowColor = col; c.shadowBlur = blur * view.rs; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); path(); c.stroke(); c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = lw * 0.35; c.beginPath(); path(); c.stroke(); c.restore(); }
function txt(c: C, s: string, x: number, y: number, size: number, fill: string | CanvasGradient, o: { font?: string; glow?: string; align?: CanvasTextAlign; stroke?: string; rot?: number } = {}) {
  c.save(); c.translate(x, y); if (o.rot) c.rotate(o.rot); c.font = `${size}px ${o.font ?? 'Bungee, Impact, sans-serif'}`; c.textAlign = o.align ?? 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = 8 * view.rs; c.fillStyle = o.glow; c.fillText(s, 0, 0); c.shadowBlur = 0; }
  if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = size * 0.14; c.strokeText(s, 0, 0); }
  c.fillStyle = fill; c.fillText(s, 0, 0); c.restore();
}
const stars = (c: C, x0: number, y0: number, x1: number, y1: number, n: number, seed: number) => { for (let i = 0; i < n; i++) circ(c, x0 + hash2(i, seed) * (x1 - x0), y0 + hash2(i, seed + 1) * (y1 - y0), 0.3 + hash2(i, seed + 2) * 0.8, `rgba(255,255,255,${0.3 + hash2(i, seed + 3) * 0.7})`); };
const bokeh = (c: C, x0: number, y0: number, x1: number, y1: number, n: number, seed: number, cols: string[], rMax = 4) => { for (let i = 0; i < n; i++) circ(c, x0 + hash2(i, seed) * (x1 - x0), y0 + hash2(i, seed + 1) * (y1 - y0), 0.8 + hash2(i, seed + 2) * rMax, hexA(cols[i % cols.length], 0.14 + hash2(i, seed + 3) * 0.4)); };
function skyline(c: C, x0: number, x1: number, base: number, hMax: number, col: string, win: string, seed: number) { for (let x = x0, i = 0; x < x1; i++) { const w = 8 + hash2(i, seed) * 16, h = 10 + hash2(i, seed + 1) * hMax; rect(c, x, base - h, w, h + 2, shade(col, hash2(i, seed + 2) * 0.14 - 0.05)); for (let wy = base - h + 3; wy < base - 2; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3.4) if (hash2(wx * 7, wy * 3 + seed) > 0.58) rect(c, wx, wy, 1.6, 1.8, hexA(win, 0.5 + hash2(wx, wy) * 0.5)); x += w + 1; } }

/* ---------------------------------------------------------------- floor in perspective */
function floorP(c: C, kind: FloorKind, cols: [string, string], accent: string) {
  const y0 = HZ, vx = DW / 2;
  rect(c, 0, y0, DW, DH - y0, lg(c, 0, y0, 0, DH, [[0, shade(cols[1], -0.15)], [1, cols[0]]]));
  const rowsY: number[] = []; for (let i = 0; i <= 16; i++) rowsY.push(y0 + Math.pow(i / 16, 1.7) * (DH - y0));
  const rowK = (y: number) => (y - y0) / (DH - y0);
  if (kind === 'planks' || kind === 'deck') {
    for (let i = 0; i < 16; i++) { const ya = rowsY[i], yb = rowsY[i + 1]; rect(c, 0, ya, DW, yb - ya, hexA(shade(cols[(i & 1) as 0 | 1], hash2(i, 3) * 0.2 - 0.1), 0.9)); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.6 + rowK(ya); c.beginPath(); c.moveTo(0, yb); c.lineTo(DW, yb); c.stroke(); }
    c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 0.6; for (let i = 0; i < 26; i++) { const x = ((i * 53) % DW) - vx; c.beginPath(); c.moveTo(vx + x * 0.05, y0); c.lineTo(vx + x * 2.4, DH); c.stroke(); }
  } else if (kind === 'tiles' || kind === 'marble' || kind === 'stone' || kind === 'concrete' || kind === 'ice') {
    for (let i = 0; i < 16; i++) for (let j = -9; j < 9; j++) {
      const ya = rowsY[i], yb = rowsY[i + 1], ka = 1 + rowK(ya) * 2.2, kb = 1 + rowK(yb) * 2.2, w0 = 30, xa0 = vx + j * w0 * ka * 0.5, xa1 = vx + (j + 1) * w0 * ka * 0.5, xb0 = vx + j * w0 * kb * 0.5, xb1 = vx + (j + 1) * w0 * kb * 0.5;
      poly(c, [[xa0, ya], [xa1, ya], [xb1, yb], [xb0, yb]], (i + j) & 1 ? cols[0] : cols[1], hexA(kind === 'ice' ? '#ffffff' : '#000000', kind === 'ice' ? 0.25 : 0.3), 0.5);
    }
  } else if (kind === 'carpet') {
    for (let i = 0; i < 16; i++) { const ya = rowsY[i], yb = rowsY[i + 1]; for (let j = -10; j < 10; j++) { const k = 1 + rowK(ya) * 2.2, x = vx + j * 22 * k; if ((i + j) & 1) poly(c, [[x, ya], [x + 11 * k, (ya + yb) / 2], [x, yb], [x - 11 * k, (ya + yb) / 2]], hexA(cols[1], 0.5)); } }
  } else { // space
    rect(c, 0, y0, DW, DH - y0, lg(c, 0, y0, 0, DH, [[0, '#050a18'], [1, '#12284a']])); stars(c, 0, y0, DW, DH, 70, 11);
    c.strokeStyle = hexA(accent, 0.25); c.lineWidth = 0.6; for (let i = 0; i < 10; i++) { const x = vx + (i - 4.5) * 70; c.beginPath(); c.moveTo(vx + (x - vx) * 0.1, y0); c.lineTo(x, DH); c.stroke(); } for (const y of rowsY) { c.beginPath(); c.moveTo(0, y); c.lineTo(DW, y); c.stroke(); }
  }
  const sh = lg(c, 0, y0, 0, y0 + 40, [[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']]); rect(c, 0, y0, DW, 40, sh);
  glow(c, vx, 175, 190, accent, 0.18);
}

/* ---------------------------------------------------------------- the carrom board in 3/4 view on a low table, with a hanging lamp */
function boardP(c: C, loc: LocDef, cx = DW / 2, cy = 170, tw = 196) {
  const st = loc.board, fw = tw * 0.7, hgt = 54, far = cy - hgt / 2, near = cy + hgt / 2, fr = 8;
  c.save(); c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.ellipse(cx, near + 26, tw * 0.56, 11, 0, 0, 7); c.fill(); c.restore();
  // legs and apron
  for (const [x, y, k] of [[cx - tw * 0.4, near + 3, 1], [cx + tw * 0.4, near + 3, 1], [cx - fw * 0.4, far + 6, 0.78], [cx + fw * 0.4, far + 6, 0.78]] as number[][]) rect(c, x - 3.6 * k, y, 7.2 * k, 28 * k, lg(c, x - 4, 0, x + 4, 0, [[0, shade(st.frame[0], -0.1)], [0.5, st.frame[0]], [1, st.frame[1]]]));
  poly(c, [[cx - tw / 2 - fr, near + fr], [cx + tw / 2 + fr, near + fr], [cx + tw / 2 + fr, near + fr + 6], [cx - tw / 2 - fr, near + fr + 6]], shade(st.frame[1], -0.1));
  // frame (outer trapezoid), then the playing surface
  poly(c, [[cx - fw / 2 - fr, far - fr * 0.6], [cx + fw / 2 + fr, far - fr * 0.6], [cx + tw / 2 + fr, near + fr], [cx - tw / 2 - fr, near + fr]], lg(c, 0, far, 0, near + fr, [[0, shade(st.frame[0], 0.18)], [1, st.frame[1]]]), 'rgba(0,0,0,0.6)', 0.8);
  if (st.frameKind === 'neon') neon(c, st.neon ?? st.trim, 1.3, () => { c.moveTo(cx - fw / 2 - fr, far - fr * 0.6); c.lineTo(cx + fw / 2 + fr, far - fr * 0.6); c.lineTo(cx + tw / 2 + fr, near + fr); c.lineTo(cx - tw / 2 - fr, near + fr); c.closePath(); }, 5);
  if (st.frameKind === 'gold') poly(c, [[cx - fw / 2 - 3, far - 1], [cx + fw / 2 + 3, far - 1], [cx + tw / 2 + 3, near + 3], [cx - tw / 2 - 3, near + 3]], 'rgba(0,0,0,0)', st.trim, 1);
  poly(c, [[cx - fw / 2, far], [cx + fw / 2, far], [cx + tw / 2, near], [cx - tw / 2, near]], rg(c, cx, cy, 8, tw * 0.62, [[0, st.surface[0]], [1, st.surface[1]]]), 'rgba(0,0,0,0.5)', 0.8);
  const P = (u: number, v: number): [number, number] => { const wy = far + v * hgt, ww = fw + (tw - fw) * v; return [cx - ww / 2 + u * ww, wy]; };
  // baselines, centre circle and corner pockets
  c.strokeStyle = hexA(st.line, 0.8); c.lineWidth = 0.7; for (const v of [0.14, 0.86]) { const a = P(0.2, v), b = P(0.8, v); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  { const m = P(0.5, 0.5); c.beginPath(); c.ellipse(m[0], m[1], tw * 0.075, hgt * 0.1, 0, 0, 7); c.stroke(); c.beginPath(); c.ellipse(m[0], m[1], tw * 0.03, hgt * 0.04, 0, 0, 7); c.fillStyle = st.ring; c.fill(); c.stroke(); }
  for (const [u, v, r] of [[0.01, 0.0, 3.4], [0.99, 0.0, 3.4], [0.01, 1.0, 4.6], [0.99, 1.0, 4.6]]) { const p = P(u, v); circ(c, p[0], p[1], r, rg(c, p[0], p[1], 0, r, [[0, '#000'], [1, st.pocket]])); }
  // coins in a cluster in the middle, and the striker
  const cm = P(0.5, 0.5), cluster: [number, number, string][] = [[0, 0, '#ff5a62'], [1, 0, '#fff4d8'], [-1, 0, '#2a2018'], [0.5, 0.9, '#2a2018'], [-0.5, 0.9, '#fff4d8'], [0.5, -0.9, '#fff4d8'], [-0.5, -0.9, '#2a2018'], [2, 0, '#fff4d8'], [-2, 0, '#2a2018'], [1, 1.8, '#2a2018'], [-1, 1.8, '#fff4d8'], [1, -1.8, '#fff4d8'], [-1, -1.8, '#2a2018']];
  for (const [u, v, col] of cluster) { const x = cm[0] + u * 4.6, y = cm[1] + v * 2.6; c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x + 0.8, y + 1.2, 2.6, 1.5, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(x, y, 2.5, 1.55, 0, 0, 7); c.fillStyle = col; c.fill(); c.lineWidth = 0.4; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.stroke(); }
  { const sp = P(0.36, 0.82); c.beginPath(); c.ellipse(sp[0], sp[1], 3.4, 2.1, 0, 0, 7); c.fillStyle = '#f6efe0'; c.fill(); c.strokeStyle = '#a89870'; c.lineWidth = 0.6; c.stroke(); }
  // lamp cone and lamp
  c.save(); poly(c, [[cx - 22, 52], [cx + 22, 52], [cx + tw * 0.46, near + 12], [cx - tw * 0.46, near + 12]], lg(c, 0, 52, 0, near, [[0, 'rgba(255,240,190,0.2)'], [1, 'rgba(255,240,190,0.03)']])); c.restore();
  c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, 36); c.stroke();
  poly(c, [[cx - 8, 36], [cx + 8, 36], [cx + 24, 52], [cx - 24, 52]], lg(c, cx - 24, 0, cx + 24, 0, [[0, shade(loc.accent, -0.2)], [0.45, shade(loc.accent, 0.3)], [1, shade(loc.accent, -0.45)]]), 'rgba(0,0,0,0.6)', 0.8);
  c.fillStyle = '#fffbe0'; c.beginPath(); c.ellipse(cx, 52, 21, 2.6, 0, 0, 7); c.fill(); glow(c, cx, 54, 40, '#fff0b0', 0.6);
}
const barrel = (c: C, x: number, y: number, s = 1) => { rrect(c, x - 9 * s, y - 20 * s, 18 * s, 22 * s, 6 * s, lg(c, x - 9 * s, 0, x + 9 * s, 0, [[0, '#a8743a'], [0.5, '#c8903f'], [1, '#6a4418']])); for (const k of [-12, -2, 8]) rect(c, x - 9.2 * s, y + k * s, 18.4 * s, 1.8 * s, '#2a2a30'); };
const brick = (c: C, x: number, y: number, w: number, h: number, base: string, bw = 14, bh = 6) => { rect(c, x, y, w, h, shade(base, -0.35)); for (let r = 0; y + r * bh < y + h; r++) for (let k = -1; x + k * bw < x + w; k++) { const bx = x + k * bw + (r & 1 ? bw / 2 : 0), by = y + r * bh; rect(c, Math.max(x, bx + 0.5), by + 0.5, Math.min(bw - 1, x + w - bx), bh - 1, shade(base, hash2(k + 9, r) * 0.2 - 0.1)); } };
const planksV = (c: C, x: number, y: number, w: number, h: number, col: string, pw = 14) => { for (let i = 0; x + i * pw < x + w; i++) { rect(c, x + i * pw, y, pw - 0.6, h, lg(c, x + i * pw, 0, x + (i + 1) * pw, 0, [[0, shade(col, hash2(i, 5) * 0.2 - 0.08)], [1, shade(col, -0.12 + hash2(i, 6) * 0.1)]])); c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x + i * pw, y); c.lineTo(x + i * pw, y + h); c.stroke(); } };
const lantern = (c: C, x: number, y: number, col = '#ffd070') => { c.strokeStyle = '#222'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x, y - 4); c.stroke(); rrect(c, x - 3.5, y - 4, 7, 9, 1.5, '#2a2018'); rect(c, x - 2.4, y - 2.6, 4.8, 6, hexA(col, 0.95)); glow(c, x, y + 1, 18, col, 0.5); };
const chandelier = (c: C, x: number, y: number, s: number, col = '#ffd23a') => { c.strokeStyle = col; c.lineWidth = 0.9 * s; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, y); c.stroke(); c.beginPath(); c.moveTo(x - 16 * s, y + 6 * s); c.quadraticCurveTo(x, y - 4 * s, x + 16 * s, y + 6 * s); c.lineWidth = 1.6 * s; c.stroke(); for (let l = -2; l <= 2; l++) { circ(c, x + l * 7 * s, y + 6 * s - Math.abs(l) * 0.4, 1.5 * s, '#fff6c0'); glow(c, x + l * 7 * s, y + 6 * s, 12 * s, col, 0.5); } };
const stool = (c: C, x: number, y: number, col: string, s = 1) => { c.strokeStyle = '#1a1a1a'; c.lineWidth = 1.4 * s; c.beginPath(); c.moveTo(x - 4 * s, y); c.lineTo(x - 5 * s, y + 16 * s); c.moveTo(x + 4 * s, y); c.lineTo(x + 5 * s, y + 16 * s); c.stroke(); c.beginPath(); c.ellipse(x, y, 7 * s, 2.6 * s, 0, 0, 7); c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 0.6; c.stroke(); };
const pot = (c: C, x: number, y: number, s = 1, col = '#a85a30') => { rrect(c, x - 6 * s, y - 9 * s, 12 * s, 10 * s, 3, lg(c, x - 6 * s, 0, x + 6 * s, 0, [[0, shade(col, 0.2)], [1, shade(col, -0.3)]])); rect(c, x - 7 * s, y - 10 * s, 14 * s, 2.4 * s, shade(col, -0.1)); };
const plant = (c: C, x: number, y: number, s = 1, col = '#3a8a3a') => { pot(c, x, y, s); for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42; c.fillStyle = shade(col, (i % 3) * 0.12 - 0.1); c.beginPath(); c.ellipse(x + Math.cos(a) * 7 * s, y - 10 * s + Math.sin(a) * 9 * s, 2.2 * s, 6 * s, a + Math.PI / 2, 0, 7); c.fill(); } };
const windowP = (c: C, x: number, y: number, w: number, h: number, sky: [string, string], fr = '#1a0e08', seed = 3) => { rect(c, x - 2, y - 2, w + 4, h + 4, fr); rect(c, x, y, w, h, lg(c, 0, y, 0, y + h, [[0, sky[0]], [1, sky[1]]])); c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); stars(c, x, y, x + w, y + h * 0.6, 12, seed); c.restore(); rect(c, x + w / 2 - 0.8, y, 1.6, h, fr); rect(c, x, y + h / 2 - 0.8, w, 1.6, fr); };
const arch = (c: C, x: number, y: number, w: number, h: number, fill: string | CanvasGradient, line = 'rgba(0,0,0,0.5)') => { c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w / 2); c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w, y + h); c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = line; c.lineWidth = 0.8; c.stroke(); };
const bunting = (c: C, x0: number, x1: number, y: number, sag: number, cols: string[]) => { const n = Math.round((x1 - x0) / 9); c.strokeStyle = '#2a1a0a'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x0, y); c.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x1, y); c.stroke(); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, yy = y + sag * 2 * 2 * t * (1 - t); poly(c, [[x - 3.4, yy], [x + 3.4, yy], [x, yy + 7]], cols[i % cols.length]); } };

/* ---------------------------------------------------------------- the ten venues (wall + props) */
type Painter = (c: C, L: LocDef) => void;
const HALLS: Painter[] = [
  /* 0 CHAI CORNER: roadside tea stall */
  (c, L) => {
    brick(c, 0, 0, DW, HZ + 4, '#a8643a'); rect(c, 0, 0, DW, HZ + 4, lg(c, 0, 0, 0, HZ, [[0, 'rgba(0,0,0,0.5)'], [0.6, 'rgba(0,0,0,0.1)'], [1, 'rgba(0,0,0,0.3)']]));
    // corrugated awning
    for (let i = 0; i < 36; i++) rect(c, i * 12, 0, 12, 30, i & 1 ? '#c8482a' : '#e8e0d0'); rect(c, 0, 28, DW, 5, 'rgba(0,0,0,0.35)'); for (let i = 0; i < 36; i++) { c.fillStyle = i & 1 ? '#c8482a' : '#e8e0d0'; c.beginPath(); c.arc(i * 12 + 6, 33, 6, 0, Math.PI); c.fill(); }
    txt(c, 'CHAI CORNER', 213, 52, 15, '#fff0c8', { glow: '#ffb347', stroke: '#3a1204' });
    // counter with kettle, glasses and shelves of jars
    rect(c, 250, 70, 150, 4, '#5a3418'); rect(c, 250, 96, 150, 4, '#5a3418'); for (let i = 0; i < 9; i++) { const col = ['#e8c07a', '#d86a3a', '#c8d8a0', '#e8a0a0', '#f4e4b0'][i % 5]; rrect(c, 256 + i * 16, 54, 11, 16, 3, lg(c, 0, 54, 0, 70, [[0, shade(col, 0.2)], [1, shade(col, -0.2)]])); rect(c, 258 + i * 16, 51, 7, 3.4, '#6a3a1a'); }
    for (let i = 0; i < 12; i++) { rect(c, 258 + i * 11.4, 86, 5.4, 10, 'rgba(255,255,255,0.5)'); rect(c, 258 + i * 11.4, 91, 5.4, 5, '#c8803a'); }
    rrect(c, 20, 74, 90, 36, 3, '#3a2418'); rect(c, 20, 74, 90, 4, '#6a4428'); rrect(c, 40, 56, 22, 20, 5, lg(c, 40, 0, 62, 0, [[0, '#e8e8f0'], [1, '#7a7a88']])); rect(c, 58, 62, 10, 3, '#9a9aa8'); rect(c, 44, 52, 14, 5, '#9a9aa8');
    for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(52 + Math.sin(i) * 3, 48 - i * 5, 3 + i, 4, 0, 0, 7); c.fill(); }
    bunting(c, 0, DW, 40, 5, ['#ffb347', '#e8483a', '#3a8a5a', '#f4e4b0']); lantern(c, 130, 76); lantern(c, 190, 70); stool(c, 140, 148, '#7a2a1a', 1.2); stool(c, 290, 150, '#7a2a1a', 1.2);
  },
  /* 1 BANYAN COURTYARD */
  (c, L) => {
    rect(c, 0, 0, DW, HZ + 4, lg(c, 0, 0, 0, HZ, [[0, '#f0a85a'], [0.6, '#f8d89a'], [1, '#c8905a']]));
    circ(c, 340, 40, 16, '#fff4c8'); glow(c, 340, 40, 60, '#fff0a0', 0.5);
    for (let i = 0; i < 6; i++) { const x = 20 + i * 76; poly(c, [[x, HZ], [x + 8, 60 + hash2(i, 5) * 20], [x + 22, 60 + hash2(i, 6) * 20], [x + 34, HZ]], '#7a5a3a'); rect(c, x - 2, 60 + hash2(i, 5) * 20 - 6, 40, 6, '#8a2a1a'); }
    // banyan: thick trunk, canopy, aerial roots
    poly(c, [[170, HZ + 2], [182, 60], [196, 30], [230, 30], [244, 60], [256, HZ + 2], [240, HZ + 2], [226, 80], [213, 90], [200, 80], [186, HZ + 2]], lg(c, 170, 0, 256, 0, [[0, '#4a3220'], [0.5, '#7a5634'], [1, '#3a2616']]), 'rgba(0,0,0,0.5)', 0.8);
    for (const [x, y, r] of [[150, 30, 40], [213, 12, 52], [280, 30, 42], [110, 56, 32], [320, 52, 34], [60, 66, 26], [370, 62, 28]] as number[][]) { circ(c, x, y, r, rg(c, x - 6, y - 8, 2, r, [[0, '#5a9a3a'], [1, '#2a5a1a']])); }
    c.strokeStyle = '#4a3220'; c.lineWidth = 1.3; for (let i = 0; i < 24; i++) { const x = 70 + i * 12 + hash2(i, 3) * 6, h = 28 + hash2(i, 4) * 50; c.beginPath(); c.moveTo(x, 40 + hash2(i, 5) * 12); c.lineTo(x + (hash2(i, 7) - 0.5) * 3, 40 + h); c.stroke(); }
    // hanging swing and lanterns, a stone platform
    c.strokeStyle = '#3a2a16'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(100, 44); c.lineTo(100, 100); c.moveTo(124, 44); c.lineTo(124, 100); c.stroke(); rect(c, 96, 100, 32, 4, '#8a5a30');
    rect(c, 0, HZ - 14, DW, 18, lg(c, 0, HZ - 14, 0, HZ + 4, [[0, '#b89a6a'], [1, '#8a7048']])); lantern(c, 300, 72, '#ffb050'); lantern(c, 340, 80, '#ffb050'); pot(c, 40, HZ - 2, 1.2); plant(c, 392, HZ - 2, 1.2, '#3a8a3a');
  },
  /* 2 SPICE MARKET LOFT */
  (c, L) => {
    planksV(c, 0, 0, DW, HZ + 4, '#7a4a28', 16); rect(c, 0, 0, DW, HZ + 4, 'rgba(40,10,0,0.4)');
    for (let i = 0; i < 6; i++) rect(c, i * 80 - 6, 0, 10, HZ + 4, '#4a2a14'); rect(c, 0, 22, DW, 6, '#3a2010');
    // light shafts from the window
    windowP(c, 162, 30, 70, 54, ['#ffd48a', '#ff9a4a'], '#2a1608', 8); poly(c, [[162, 84], [232, 84], [300, HZ + 4], [120, HZ + 4]], 'rgba(255,214,140,0.18)');
    // spice mounds in sacks
    [['#e8a02a', 40], ['#c8402a', 92], ['#6a8a2a', 306], ['#d8c080', 350], ['#8a3a1a', 400]].forEach(([col, x], i) => { const xx = x as number; rrect(c, xx - 20, 84, 40, 28, 4, '#c8a878'); c.fillStyle = col as string; c.beginPath(); c.moveTo(xx - 20, 86); c.quadraticCurveTo(xx, 62 + (i % 2) * 6, xx + 20, 86); c.closePath(); c.fill(); rect(c, xx - 20, 84, 40, 2, 'rgba(0,0,0,0.3)'); });
    // chilli strings and brass scales
    for (const x of [130, 250, 280]) { c.strokeStyle = '#2a1a0a'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x, 28); c.lineTo(x, 80); c.stroke(); for (let k = 0; k < 8; k++) { c.fillStyle = k & 1 ? '#d82a1a' : '#a81a10'; c.beginPath(); c.ellipse(x + (k & 1 ? 2 : -2), 36 + k * 5.4, 2, 4, 0.2, 0, 7); c.fill(); } }
    c.strokeStyle = '#c8a040'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(60, 22); c.lineTo(60, 40); c.moveTo(34, 40); c.lineTo(86, 40); c.stroke(); for (const x of [34, 86]) { c.beginPath(); c.arc(x, 48, 10, 0.2, Math.PI - 0.2); c.stroke(); }
    lantern(c, 200, 96, '#ff9a4a'); barrel(c, 392, 138, 1.2);
  },
  /* 3 TEA ESTATE VERANDA */
  (c, L) => {
    rect(c, 0, 0, DW, HZ + 4, lg(c, 0, 0, 0, HZ, [[0, '#a8d8f0'], [1, '#e8f4e0']]));
    // misty hills with tea rows
    for (const [col, base, amp, ph] of [['#7ab890', 78, 18, 1], ['#4a9a5a', 92, 14, 2.4], ['#2a7a3a', 106, 10, 3.6]] as [string, number, number, number][]) { c.fillStyle = col; c.beginPath(); c.moveTo(0, HZ + 4); for (let x = 0; x <= DW; x += 8) c.lineTo(x, base - Math.sin(x * 0.012 + ph) * amp - Math.sin(x * 0.03 + ph) * 4); c.lineTo(DW, HZ + 4); c.fill(); }
    c.strokeStyle = 'rgba(20,60,20,0.35)'; c.lineWidth = 0.7; for (let r = 0; r < 14; r++) { c.beginPath(); c.moveTo(0, 96 + r * 1.2); c.quadraticCurveTo(213, 84 + r * 2.2, DW, 100 + r * 1.2); c.stroke(); }
    rect(c, 0, 60, DW, 30, 'rgba(255,255,255,0.28)'); glow(c, 100, 70, 80, '#ffffff', 0.4);
    // white pillars, railing and roof beam
    for (const x of [30, 150, 276, 396]) { rect(c, x - 7, 14, 14, HZ - 10, lg(c, x - 7, 0, x + 7, 0, [[0, '#f0e8d8'], [0.5, '#ffffff'], [1, '#b8ac98']])); rect(c, x - 9, 10, 18, 5, '#e0d4bc'); rect(c, x - 9, HZ - 8, 18, 6, '#e0d4bc'); }
    rect(c, 0, 0, DW, 14, lg(c, 0, 0, 0, 14, [[0, '#5a3a1a'], [1, '#3a2410']])); rect(c, 0, HZ - 20, DW, 3, '#f0e8d8'); for (let x = 4; x < DW; x += 12) rect(c, x, HZ - 17, 2.4, 14, '#e8dcc4');
    for (const x of [90, 215, 340]) { c.strokeStyle = '#3a6a2a'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x, 14); c.lineTo(x, 24); c.stroke(); pot(c, x, 34, 0.9, '#a85a30'); for (let k = 0; k < 6; k++) { c.fillStyle = '#4a9a3a'; c.beginPath(); c.ellipse(x + (k - 2.5) * 3, 36 + k % 2 * 4, 1.6, 8, (k - 2.5) * 0.12, 0, 7); c.fill(); } }
    rrect(c, 322, 100, 30, 14, 4, '#8a5a30'); rrect(c, 322, 88, 30, 14, 4, '#a8743a');
  },
  /* 4 BACKWATER HOUSEBOAT */
  (c, L) => {
    rect(c, 0, 0, DW, HZ + 4, lg(c, 0, 0, 0, HZ, [[0, '#f8c880'], [0.5, '#9ad0d8'], [1, '#3a98a8']]));
    circ(c, 300, 56, 18, '#fff2c0'); glow(c, 300, 56, 70, '#ffd090', 0.55);
    // palms across the water
    for (const [x, h] of [[60, 70], [110, 54], [340, 66], [390, 50]] as number[][]) { c.strokeStyle = '#3a2a16'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x, HZ - 6); c.quadraticCurveTo(x + 6, HZ - h / 2, x - 2, HZ - h); c.stroke(); for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.55; c.strokeStyle = '#1a5a2a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 2, HZ - h); c.quadraticCurveTo(x - 2 + Math.cos(a) * 12, HZ - h + Math.sin(a) * 8 - 6, x - 2 + Math.cos(a) * 24, HZ - h + Math.sin(a) * 14 + 6); c.stroke(); } }
    rect(c, 0, HZ - 22, DW, 26, lg(c, 0, HZ - 22, 0, HZ + 4, [[0, '#4ab0b8'], [1, '#1a6a78']])); for (let i = 0; i < 30; i++) rect(c, hash2(i, 1) * DW, HZ - 20 + hash2(i, 2) * 22, 8 + hash2(i, 3) * 18, 0.8, 'rgba(255,255,255,0.35)');
    // thatched roof (woven palm leaf) over the deck and posts
    poly(c, [[0, 0], [DW, 0], [DW, 36], [0, 36]], '#7a5a2a'); for (let i = 0; i < 70; i++) { c.strokeStyle = i & 1 ? 'rgba(40,20,0,0.35)' : 'rgba(255,220,140,0.25)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(i * 6.4, 0); c.lineTo(i * 6.4 + 3, 36); c.stroke(); } rect(c, 0, 34, DW, 4, '#3a2410');
    for (const x of [20, 213, 407]) rect(c, x - 3, 36, 6, HZ - 36, lg(c, x - 3, 0, x + 3, 0, [[0, '#8a5a2a'], [1, '#4a2c12']]));
    rect(c, 0, HZ - 28, DW, 3, '#6a4220'); for (let x = 6; x < DW; x += 14) rect(c, x, HZ - 25, 2.4, 22, '#6a4220');
    lantern(c, 120, 60, '#ffb050'); lantern(c, 310, 60, '#ffb050'); plant(c, 60, HZ - 3, 1.2);
  },
  /* 5 MAHARAJA DURBAR */
  (c, L) => {
    rect(c, 0, 0, DW, HZ + 4, lg(c, 0, 0, 0, HZ, [[0, '#5a0c1c'], [1, '#2a040c']]));
    for (let i = 0; i < 5; i++) arch(c, 22 + i * 82, 22, 60, 100, lg(c, 0, 22, 0, 120, [[0, '#2a0a14'], [1, '#6a2030']]), '#ffd23a');
    for (let i = 0; i < 6; i++) { const x = 8 + i * 82; rect(c, x - 5, 18, 10, HZ - 14, lg(c, x - 5, 0, x + 5, 0, [[0, '#e8e0d0'], [0.5, '#ffffff'], [1, '#a8a090']])); rect(c, x - 7, 14, 14, 5, '#ffd23a'); rect(c, x - 7, HZ - 2, 14, 5, '#ffd23a'); }
    for (let i = 0; i < 5; i++) { circ(c, 52 + i * 82, 56, 4, '#ffd23a'); for (let k = 0; k < 8; k++) { const a = k * 0.785; c.strokeStyle = 'rgba(255,210,60,0.7)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(52 + i * 82 + Math.cos(a) * 5, 56 + Math.sin(a) * 5); c.lineTo(52 + i * 82 + Math.cos(a) * 12, 56 + Math.sin(a) * 12); c.stroke(); } }
    // throne
    arch(c, 183, 56, 60, 60, lg(c, 0, 56, 0, 116, [[0, '#a01830'], [1, '#5a0a1a']]), '#ffd23a'); rect(c, 192, 96, 42, 16, '#c8901a'); rect(c, 188, 104, 50, 8, '#ffd23a');
    txt(c, 'MAHARAJA DURBAR', 213, 12, 10, '#ffe8a0', { glow: '#ffd23a' }); chandelier(c, 110, 24, 1.1); chandelier(c, 316, 24, 1.1);
  },
  /* 6 DESERT HAVELI */
  (c, L) => {
    rect(c, 0, 0, DW, HZ + 4, lg(c, 0, 0, 0, HZ, [[0, '#d8785a'], [1, '#f0b088']]));
    for (let x = 0; x < DW; x += 14) for (let y = 0; y < HZ; y += 14) { rect(c, x, y, 13, 13, hexA(shade('#e89a78', hash2(x, y) * 0.16 - 0.06), 0.55)); }
    // jharokha balcony windows with jaali
    for (const x of [48, 190, 332]) { rect(c, x - 3, 22, 56, 70, '#8a4a2a'); arch(c, x, 26, 50, 66, lg(c, 0, 26, 0, 92, [[0, '#2a1218'], [1, '#6a3030']]), '#f0c070'); c.strokeStyle = 'rgba(240,192,112,0.55)'; c.lineWidth = 0.6; for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(x + 4, 56 + k * 5); c.lineTo(x + 46, 56 + k * 5); c.stroke(); c.beginPath(); c.moveTo(x + 5 + k * 5.5, 40); c.lineTo(x + 5 + k * 5.5, 92); c.stroke(); } rect(c, x - 6, 92, 62, 6, '#c8803a'); rect(c, x - 4, 98, 58, 4, '#a8602a'); }
    for (const x of [120, 262, 392]) { rect(c, x - 1, 0, 2, 28, '#3a2410'); poly(c, [[x - 8, 28], [x + 8, 28], [x + 12, 44], [x - 12, 44]], lg(c, x - 12, 0, x + 12, 0, [[0, '#c8402a'], [0.5, '#f08a3a'], [1, '#8a2a1a']]), '#3a1a0a', 0.6); glow(c, x, 40, 22, '#ffb050', 0.5); }
    rect(c, 0, HZ - 10, DW, 14, '#a8643a'); for (let x = 0; x < DW; x += 24) { rect(c, x, HZ - 10, 23, 2, '#d8904a'); } plant(c, 20, HZ - 3, 1.2, '#4a8a3a'); plant(c, 405, HZ - 3, 1.2, '#4a8a3a');
  },
  /* 7 HIMALAYA LODGE */
  (c, L) => {
    for (let y = 0; y < HZ + 4; y += 12) rect(c, 0, y, DW, 11.4, lg(c, 0, y, 0, y + 11.4, [[0, '#9a6a3a'], [0.5, '#8a5a30'], [1, '#5a3a1a']])); rect(c, 0, 0, DW, HZ + 4, 'rgba(20,8,0,0.3)');
    // window onto snowy peaks
    rect(c, 140, 18, 146, 78, '#2a1608'); rect(c, 144, 22, 138, 70, lg(c, 0, 22, 0, 92, [[0, '#7ab8f0'], [1, '#e8f4ff']])); poly(c, [[144, 92], [186, 40], [210, 64], [238, 28], [282, 92]], '#d8e4f4', 'rgba(60,80,120,0.5)', 0.8); poly(c, [[238, 28], [226, 46], [238, 42], [250, 48]], '#ffffff'); rect(c, 211, 22, 2, 70, '#2a1608'); rect(c, 144, 56, 138, 2, '#2a1608');
    // prayer flags
    for (const [y0, sag] of [[16, 8], [40, 10]] as number[][]) { c.strokeStyle = '#2a1a0a'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(0, y0); c.quadraticCurveTo(DW / 2, y0 + sag * 2, DW, y0); c.stroke(); for (let i = 0; i < 40; i++) { const t = (i + 0.5) / 40, x = DW * t, y = y0 + sag * 4 * t * (1 - t); poly(c, [[x - 3.4, y], [x + 3.4, y], [x + 3.4, y + 6], [x - 3.4, y + 6]], ['#3a78e0', '#f4f4f0', '#e03a3a', '#3ac878', '#f0c83a'][i % 5]); } }
    // stove and thermos, bench
    rrect(c, 20, 70, 50, 42, 4, '#2a2a30'); rect(c, 24, 74, 42, 20, '#ff9a2a'); glow(c, 45, 90, 40, '#ff8a1a', 0.6); rect(c, 28, 60, 8, 12, '#1a1a1a'); rrect(c, 340, 80, 60, 14, 4, '#7a4a28'); rect(c, 344, 94, 5, 18, '#5a3418'); rect(c, 392, 94, 5, 18, '#5a3418');
    lantern(c, 320, 70, '#ffb050'); lantern(c, 110, 60, '#ffb050');
  },
  /* 8 NIGHT BAZAAR */
  (c, L) => {
    rect(c, 0, 0, DW, HZ + 4, lg(c, 0, 0, 0, HZ, [[0, '#0c0620'], [1, '#2a1048']])); stars(c, 0, 0, DW, 40, 40, 5);
    for (let i = 0; i < 7; i++) { const x = 8 + i * 62, col = ['#ff3ad8', '#3affd8', '#ffd23a', '#ff6a3a', '#7a9aff', '#ff3a6a', '#3aff7a'][i]; rect(c, x, 44, 54, 66, lg(c, 0, 44, 0, 110, [[0, '#1c1230'], [1, '#0c0818']])); for (let k = 0; k < 7; k++) { c.fillStyle = k & 1 ? col : '#f4f0e0'; c.beginPath(); c.moveTo(x - 2 + k * 8, 44); c.lineTo(x + 6 + k * 8, 44); c.lineTo(x + 6 + k * 8, 58); c.arc(x + 2 + k * 8, 58, 4, 0, Math.PI); c.closePath(); c.fill(); } neon(c, col, 1.3, () => { c.moveTo(x + 8, 74); c.lineTo(x + 46, 74); c.moveTo(x + 14, 88); c.lineTo(x + 40, 88); }, 5); glow(c, x + 27, 84, 40, col, 0.28); }
    // lantern strings
    for (let r = 0; r < 2; r++) { c.strokeStyle = '#1a1020'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(0, 10 + r * 14); c.quadraticCurveTo(DW / 2, 30 + r * 14, DW, 10 + r * 14); c.stroke(); for (let i = 0; i < 17; i++) { const t = (i + 0.5) / 17, x = DW * t, y = 10 + r * 14 + 20 * 2 * t * (1 - t) * 1; circ(c, x, y + 4, 3.4, hexA(['#ff3a6a', '#ffd23a', '#3affd8', '#ff9a2a'][(i + r) % 4], 0.95)); glow(c, x, y + 4, 11, ['#ff3a6a', '#ffd23a', '#3affd8', '#ff9a2a'][(i + r) % 4], 0.5); } }
    txt(c, 'NIGHT BAZAAR', 213, 100, 11, '#ffd0f4', { glow: '#ff3ad8' }); bokeh(c, 0, 20, DW, 100, 16, 11, ['#ff7ae8', '#ffd23a', '#3affd8'], 4);
  },
  /* 9 GRAND CHAMPIONSHIP */
  (c, L) => {
    rect(c, 0, 0, DW, HZ + 4, lg(c, 0, 0, 0, HZ, [[0, '#080414'], [1, '#2a1030']]));
    // stands with crowd silhouettes
    for (let r = 0; r < 4; r++) { const y = 56 + r * 14; rect(c, 0, y, DW, 14, shade('#2a1830', -r * 0.1)); for (let i = 0; i < 60; i++) { const x = i * 7.3 + (r & 1) * 3, col = ['#c8402a', '#e8a02a', '#3a78c8', '#f0e0c0', '#8a3aa8'][Math.floor(hash2(i, r) * 5)]; circ(c, x, y + 4, 2.3, shade('#d8a070', hash2(i, r + 3) * 0.3 - 0.2)); rrect(c, x - 2.6, y + 6, 5.2, 7, 2, col); } }
    for (const x of [60, 150, 276, 366]) { poly(c, [[x - 4, 0], [x + 4, 0], [x + 36, 112], [x - 36, 112]], 'rgba(255,240,190,0.1)'); glow(c, x, 4, 24, '#fff0b0', 0.6); }
    // banner and trophy
    rrect(c, 140, 8, 146, 30, 5, lg(c, 0, 8, 0, 38, [[0, '#a01830'], [1, '#5a0a1a']])); rrect(c, 143, 11, 140, 24, 4, 'rgba(0,0,0,0.25)'); txt(c, 'CHAMPIONSHIP', 213, 24, 16, lg(c, 0, 14, 0, 34, [[0, '#fff4b0'], [1, '#d8a020']]), { glow: '#ffd23a' });
    rect(c, 190, 92, 46, 14, '#3a2010'); rect(c, 196, 88, 34, 6, '#5a3418'); c.save(); c.translate(201, 62); c.scale(1, 1); const tp = new Path2D('M5 2h14v2h3v5c0 2.2-1.8 4-4 4h-.4A6 6 0 0 1 13 16.9V19h3v2H8v-2h3v-2.1A6 6 0 0 1 6.4 13H6c-2.2 0-4-1.8-4-4V4h3V2zm-1 4v3c0 1.1.9 2 2 2V6H4zm16 0h-2v5c1.1 0 2-.9 2-2V6z'); c.scale(1.1, 1.1); c.fillStyle = lg(c, 0, 2, 0, 22, [[0, '#fff4a0'], [1, '#e0a010']]); c.fill(tp); c.restore(); glow(c, 213, 76, 36, '#ffd23a', 0.35);
  },
];

/* ---------------------------------------------------------------- composing */
const hallCache = new Map<string, HTMLCanvasElement>();
export function hallArt(loc: number, w: number, h: number): HTMLCanvasElement {
  const key = `${loc}|${Math.round(w)}|${Math.round(h)}|${view.rs}`, hit = hallCache.get(key); if (hit) return hit;
  const L = LOCS[loc], { cv, ctx: c } = hi(w, h), k = Math.max(w / DW, h / DH);
  c.save(); c.translate((w - DW * k) / 2, (h - DH * k) / 2 + (h - DH * k) * 0.0); c.scale(k, k); c.beginPath(); c.rect(0, 0, DW, DH); c.clip();
  HALLS[loc](c, L); floorP(c, L.floor, L.floorCols, L.accent);
  // props that must stand on the floor are painted by the hall; the board and lamp go on top of the floor
  boardP(c, L);
  // light, tint and vignette
  rect(c, 0, 0, DW, DH, lg(c, 0, 0, 0, DH, [[0, hexA(L.sky[0], 0.35)], [0.5, hexA(L.sky[1], 0.05)], [1, 'rgba(0,0,0,0.25)']]));
  const vg = rg(c, DW / 2, DH * 0.55, DH * 0.35, DW * 0.62, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(5,3,1,0.6)']]); rect(c, 0, 0, DW, DH, vg);
  c.restore();
  hallCache.set(key, cv); return cv;
}

/* ---------------------------------------------------------------- top-down floors for the match */
const floorCache = new Map<string, HTMLCanvasElement>();
export function floorArt(loc: number): HTMLCanvasElement {
  const w = view.w, h = view.h, key = `${loc}|${w}|${view.rs}`, hit = floorCache.get(key); if (hit) return hit;
  const L = LOCS[loc], { cv, ctx: c } = hi(w, h), [a, b] = L.floorCols;
  rect(c, 0, 0, w, h, a);
  switch (L.floor) {
    case 'planks': case 'deck': for (let y = 0, i = 0; y < h; y += 14, i++) { rect(c, 0, y, w, 13.4, shade(i & 1 ? a : b, hash2(i, 3) * 0.2 - 0.1)); for (let x = (i * 53) % 90; x < w; x += 90) rect(c, x, y, 0.8, 14, 'rgba(0,0,0,0.4)'); c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 0.4; for (let k = 0; k < 4; k++) { const gy = y + 2 + hash2(i, k) * 9; c.beginPath(); c.moveTo(0, gy); c.lineTo(w, gy + (hash2(i, k + 4) - 0.5) * 2); c.stroke(); } rect(c, 0, y + 13.4, w, 0.7, 'rgba(0,0,0,0.5)'); } break;
    case 'tiles': case 'marble': case 'stone': case 'concrete': case 'ice': { const s = L.floor === 'concrete' ? 40 : 22; for (let y = 0, i = 0; y < h; y += s, i++) for (let x = 0, j = 0; x < w; x += s, j++) { rect(c, x, y, s, s, shade((i + j) & 1 ? a : b, hash2(i, j) * 0.1 - 0.05)); rect(c, x, y, s, 0.7, L.floor === 'ice' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'); rect(c, x, y, 0.7, s, L.floor === 'ice' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'); if (L.floor === 'marble') { c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x + hash2(i, j) * s, y); c.lineTo(x + hash2(j, i) * s, y + s); c.stroke(); } } break; }
    case 'carpet': for (let y = 0, i = 0; y < h; y += 16, i++) for (let x = (i & 1) * 8, j = 0; x < w; x += 16, j++) { c.fillStyle = hexA(b, 0.55); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 8, y + 8); c.lineTo(x, y + 16); c.lineTo(x - 8, y + 8); c.fill(); circ(c, x, y + 8, 1.4, hexA('#ffd23a', 0.35)); } break;
    default: rect(c, 0, 0, w, h, lg(c, 0, 0, 0, h, [[0, '#06102a'], [1, '#12284a']])); stars(c, 0, 0, w, h, 130, 7); for (let i = 0; i < 6; i++) { c.strokeStyle = hexA(L.accent, 0.16); c.lineWidth = 0.6; c.beginPath(); c.arc(w / 2, h / 2, 40 + i * 38, 0, 7); c.stroke(); }
  }
  for (let i = 0; i < 700; i++) rect(c, hash2(i, 61) * w, hash2(i, 62) * h, 0.8, 0.8, hash2(i, 63) > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)');
  // props around the table (top down): stools, barrels, plants, small tables
  const props: [number, number, number][] = [[0.04, 0.2, 0], [0.04, 0.78, 1], [0.96, 0.22, 1], [0.96, 0.8, 0], [0.12, 0.1, 2], [0.88, 0.1, 2]];
  for (const [fx, fy, kind] of props) { const x = fx * w, y = fy * h; c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x + 2, y + 3, 9, 8, 0, 0, 7); c.fill(); if (kind === 0) { circ(c, x, y, 8, rg(c, x - 2, y - 2, 1, 9, [[0, shade(L.accent, 0.2)], [1, shade(L.accent, -0.5)]])); circ(c, x, y, 5, 'rgba(255,255,255,0.12)'); } else if (kind === 1) { circ(c, x, y, 9, rg(c, x - 3, y - 3, 1, 10, [[0, '#c8903f'], [1, '#5a3a14']])); c.strokeStyle = '#2a2a30'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, 6.5, 0, 7); c.stroke(); } else { for (let i = 0; i < 9; i++) { const ang = i * 0.7; c.fillStyle = shade('#8f5f35', (i % 3) * 0.1 - 0.1); c.beginPath(); c.ellipse(x + Math.cos(ang) * 4.5, y + Math.sin(ang) * 4.5, 6, 2.2, ang, 0, 7); c.fill(); } } }
  // the lamp pool of light over the table, accent colour at the sides, vignette
  const lamp = rg(c, w / 2, h * 0.44, 20, w * 0.5, [[0, 'rgba(255,244,200,0.34)'], [0.5, 'rgba(255,244,200,0.1)'], [1, 'rgba(0,0,0,0)']]); rect(c, 0, 0, w, h, lamp);
  rect(c, 0, 0, w, h, rg(c, w / 2, h / 2, h * 0.3, w * 0.66, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(7,4,1,0.78)']]));
  glow(c, 0, h / 2, 90, L.accent, 0.12); glow(c, w, h / 2, 90, L.accent, 0.12);
  void mixHex;
  floorCache.set(key, cv); return cv;
}
export function clearHallCache() { hallCache.clear(); floorCache.clear(); }
