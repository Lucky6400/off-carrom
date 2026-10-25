/* The carrom board, painted once per board style into a hi-res canvas: wooden frame with grain and mitred corners, the raised rim, plywood playing surface with powder dust,
   baselines with their end circles, the diagonal corner arrows, the centre motif, and netted corner pockets matching the physics. Coordinates inside are in metres
   projected with S logical px per metre; (ox, oy) is where the middle of the playing surface sits. */
import type { BoardStyle } from '../data/locations.js';
import { HB, BASE_X, BASE_Y, PK_IN, PK_R } from '../game/physics.js';
import { view } from '../config.js';
import { hi } from './hires.js';
import { hash2, shade } from '../util.js';

export interface BoardArt { cv: HTMLCanvasElement; w: number; h: number; ox: number; oy: number; S: number }
export const FRAME_W = 0.07, RIM_W = 0.018;
const cache = new Map<string, BoardArt>();
const hexA = (h: string, a: number) => { const v = parseInt(h.slice(1), 16); return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`; };
type C = CanvasRenderingContext2D;

/** wood: base gradient plus long grain strokes and a few knots, clipped by the caller */
function wood(c: C, x: number, y: number, w: number, h: number, a: string, b: string, kind: string, seed: number, vertical = false) {
  const g = vertical ? c.createLinearGradient(x, 0, x + w, 0) : c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(a, 0.14)); g.addColorStop(0.45, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(x, y, w, h);
  const dark = kind === 'rosewood' ? 'rgba(20,4,2,0.34)' : kind === 'ebony' || kind === 'neon' ? 'rgba(255,255,255,0.07)' : 'rgba(50,22,6,0.24)', lite = kind === 'ebony' || kind === 'neon' ? 'rgba(255,255,255,0.05)' : 'rgba(255,236,190,0.16)';
  const n = Math.round((w * h) / 140);
  for (let i = 0; i < n; i++) {
    const t = hash2(i, seed), u = hash2(i, seed + 1), len = (0.1 + hash2(i, seed + 2) * 0.5) * (vertical ? h : w), wob = (hash2(i, seed + 3) - 0.5) * 1.6;
    c.strokeStyle = hash2(i, seed + 4) > 0.45 ? dark : lite; c.lineWidth = 0.3 + hash2(i, seed + 5) * 0.5; c.beginPath();
    if (vertical) { const px = x + t * w, py = y + u * h; c.moveTo(px, py); c.bezierCurveTo(px + wob, py + len * 0.3, px - wob, py + len * 0.7, px + wob * 0.4, py + len); }
    else { const px = x + t * w, py = y + u * h; c.moveTo(px, py); c.bezierCurveTo(px + len * 0.3, py + wob, px + len * 0.7, py - wob, px + len, py + wob * 0.4); }
    c.stroke();
  }
  if (kind !== 'ebony' && kind !== 'neon') for (let i = 0; i < 2; i++) { const kx = x + hash2(i, seed + 9) * w, ky = y + hash2(i, seed + 10) * h; c.strokeStyle = dark; c.lineWidth = 0.4; for (let r = 1; r < 4; r++) { c.beginPath(); c.ellipse(kx, ky, r * 1.2, r * 0.55, 0, 0, 7); c.stroke(); } }
}

export function boardArt(id: string, st: BoardStyle, S: number, pk = 1): BoardArt {
  const key = `${id}|${S.toFixed(1)}|${pk.toFixed(2)}|${view.rs}`, hit = cache.get(key); if (hit) return hit;
  const pad = 10, F = HB + FRAME_W, w = 2 * F * S + pad * 2, h = w, ox = w / 2, oy = h / 2, rs = view.rs;
  const { cv, ctx: c } = hi(w, h), X = (x: number) => ox + x * S, Y = (y: number) => oy - y * S;
  const fx0 = X(-F), fy0 = Y(F), fw = 2 * F * S, rad = 0.028 * S;
  const frame = () => { c.beginPath(); c.roundRect(fx0, fy0, fw, fw, rad); };
  const accent = st.neon ?? st.trim;

  /* ---- shadow / glow under the board */
  c.save(); c.shadowColor = st.frameKind === 'neon' ? hexA(accent, 0.75) : 'rgba(0,0,0,0.65)'; c.shadowBlur = (st.frameKind === 'neon' ? 14 : 10) * rs; c.shadowOffsetY = st.frameKind === 'neon' ? 0 : 3 * rs; frame(); c.fillStyle = '#000'; c.fill(); c.restore();

  /* ---- frame wood, then mitre joints */
  c.save(); frame(); c.clip(); wood(c, fx0, fy0, fw, fw, st.frame[0], st.frame[1], st.frameKind, 11);
  // the four frame strips are cut at 45 degrees: the grain of the side strips runs vertically
  const inner = (HB + RIM_W) * S;
  c.save(); c.beginPath(); c.moveTo(fx0, fy0); c.lineTo(fx0 + fw, fy0); c.lineTo(ox + inner, oy - inner); c.lineTo(ox - inner, oy - inner); c.closePath(); c.fillStyle = 'rgba(255,255,255,0.05)'; c.fill(); c.restore();
  c.save(); c.beginPath(); c.moveTo(fx0, fy0 + fw); c.lineTo(fx0 + fw, fy0 + fw); c.lineTo(ox + inner, oy + inner); c.lineTo(ox - inner, oy + inner); c.closePath(); c.fillStyle = 'rgba(0,0,0,0.1)'; c.fill(); c.restore();
  c.save(); c.beginPath(); c.moveTo(fx0, fy0); c.lineTo(ox - inner, oy - inner); c.lineTo(ox - inner, oy + inner); c.lineTo(fx0, fy0 + fw); c.closePath(); c.fillStyle = 'rgba(255,255,255,0.025)'; c.fill(); c.restore();
  c.strokeStyle = 'rgba(0,0,0,0.38)'; c.lineWidth = 0.7; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.moveTo(ox + sx * F * S, oy + sy * F * S); c.lineTo(ox + sx * inner, oy + sy * inner); c.stroke(); c.strokeStyle = 'rgba(255,230,180,0.16)'; c.beginPath(); c.moveTo(ox + sx * F * S + 0.8, oy + sy * F * S); c.lineTo(ox + sx * inner + 0.8, oy + sy * inner); c.stroke(); c.strokeStyle = 'rgba(0,0,0,0.38)'; }
  const sheen = c.createLinearGradient(fx0, fy0, fx0 + fw, fy0 + fw); sheen.addColorStop(0, 'rgba(255,255,255,0.26)'); sheen.addColorStop(0.35, 'rgba(255,255,255,0.03)'); sheen.addColorStop(0.7, 'rgba(0,0,0,0)'); sheen.addColorStop(1, 'rgba(0,0,0,0.3)'); c.fillStyle = sheen; c.fillRect(fx0, fy0, fw, fw);
  c.restore();
  frame(); c.lineWidth = 0.9; c.strokeStyle = 'rgba(0,0,0,0.7)'; c.stroke();
  c.beginPath(); c.roundRect(fx0 + 0.9, fy0 + 0.9, fw - 1.8, fw - 1.8, rad); c.lineWidth = 0.7; c.strokeStyle = 'rgba(255,255,255,0.4)'; c.stroke();
  // inlay line on the frame
  { const m = 0.026 * S; c.beginPath(); c.roundRect(fx0 + m, fy0 + m, fw - 2 * m, fw - 2 * m, rad * 0.6); c.lineWidth = st.frameKind === 'gold' ? 1.4 : 0.8; c.strokeStyle = st.frameKind === 'gold' ? hexA(st.trim, 0.95) : 'rgba(0,0,0,0.32)'; c.stroke();
    if (st.frameKind === 'gold') { c.beginPath(); c.roundRect(fx0 + m + 2.4, fy0 + m + 2.4, fw - 2 * m - 4.8, fw - 2 * m - 4.8, rad * 0.5); c.lineWidth = 0.5; c.strokeStyle = hexA(st.trim, 0.55); c.stroke(); } }
  if (st.frameKind === 'neon') for (const m of [0.012, 0.052]) { const mm = m * S; c.save(); c.shadowColor = accent; c.shadowBlur = 7 * rs; c.beginPath(); c.roundRect(fx0 + mm, fy0 + mm, fw - 2 * mm, fw - 2 * mm, rad * 0.6); c.lineWidth = 1.6; c.strokeStyle = accent; c.stroke(); c.shadowBlur = 0; c.lineWidth = 0.55; c.strokeStyle = '#ffffff'; c.stroke(); c.restore(); }
  // small studs / corner caps
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const cx = X(sx * (HB + RIM_W + (FRAME_W - RIM_W) * 0.62)), cy = Y(sy * (HB + RIM_W + (FRAME_W - RIM_W) * 0.62)); c.save(); c.translate(cx, cy); c.beginPath(); c.arc(0, 0, 0.0145 * S, 0, 7); const g = c.createRadialGradient(-1, -1, 0.3, 0, 0, 0.018 * S); g.addColorStop(0, shade(st.trim, 0.55)); g.addColorStop(1, shade(st.trim, -0.45)); c.fillStyle = g; c.fill(); c.lineWidth = 0.5; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.stroke(); c.restore(); }

  /* ---- raised rim (the bumper the coins bounce off) */
  { const o = (HB + RIM_W) * S, i = HB * S; c.save(); c.beginPath(); c.rect(ox - o, oy - o, 2 * o, 2 * o); c.rect(ox - i, oy - i, 2 * i, 2 * i); c.clip('evenodd');
    wood(c, ox - o, oy - o, 2 * o, 2 * o, shade(st.frame[0], 0.12), shade(st.frame[1], 0.05), st.frameKind, 31); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(ox - o, oy - o, 2 * o, 2 * o); c.restore();
    c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 0.8; c.strokeRect(ox - o, oy - o, 2 * o, 2 * o); c.strokeStyle = 'rgba(255,240,200,0.4)'; c.lineWidth = 0.6; c.strokeRect(ox - o + 0.9, oy - o + 0.9, 2 * o - 1.8, 2 * o - 1.8); }

  /* ---- playing surface */
  const px0 = X(-HB), py0 = Y(HB), pw = 2 * HB * S;
  c.save(); c.beginPath(); c.rect(px0, py0, pw, pw); c.clip();
  const sg = c.createRadialGradient(ox - pw * 0.06, oy - pw * 0.1, pw * 0.05, ox, oy, pw * 0.75); sg.addColorStop(0, st.surface[0]); sg.addColorStop(1, st.surface[1]); c.fillStyle = sg; c.fillRect(px0, py0, pw, pw);
  // plywood grain
  for (let i = 0; i < 70; i++) { const t = hash2(i, 41), u = hash2(i, 42), len = (0.25 + hash2(i, 43) * 0.7) * pw; c.strokeStyle = hash2(i, 44) > 0.5 ? 'rgba(60,30,8,0.07)' : 'rgba(255,248,224,0.08)'; c.lineWidth = 0.4 + hash2(i, 45) * 0.8; c.beginPath(); const x = px0 + t * pw - len * 0.5, y = py0 + u * pw; c.moveTo(x, y); c.bezierCurveTo(x + len * 0.3, y + (hash2(i, 46) - 0.5) * 2, x + len * 0.7, y + (hash2(i, 47) - 0.5) * 2, x + len, y); c.stroke(); }
  // boric powder dust
  const n = Math.round(pw * pw * 0.05); for (let i = 0; i < n; i++) { const x = px0 + hash2(i, 51) * pw, y = py0 + hash2(i, 52) * pw, k = hash2(i, 53); c.fillStyle = k > 0.4 ? `rgba(255,255,255,${0.06 + k * 0.08})` : `rgba(60,30,10,${0.04 + (1 - k) * 0.05})`; c.fillRect(x, y, 0.5, 0.5); }
  const lamp = c.createRadialGradient(ox - pw * 0.05, oy - pw * 0.1, 4, ox, oy, pw * 0.66); lamp.addColorStop(0, 'rgba(255,255,255,0.22)'); lamp.addColorStop(0.55, 'rgba(255,255,255,0.05)'); lamp.addColorStop(1, 'rgba(0,0,0,0.26)'); c.fillStyle = lamp; c.fillRect(px0, py0, pw, pw);
  const L = st.line, lw = Math.max(0.55, 0.0032 * S);
  c.lineCap = 'round'; c.lineJoin = 'round';
  // border line just inside the rim
  c.strokeStyle = hexA(L, 0.85); c.lineWidth = lw; c.strokeRect(X(-HB + 0.012), Y(HB - 0.012), (2 * HB - 0.024) * S, (2 * HB - 0.024) * S);
  // baselines, one per side: a double line with a circle at each end
  for (let side = 0; side < 4; side++) {
    c.save(); c.translate(ox, oy); c.rotate((side * Math.PI) / 2);
    const by = BASE_Y * S, half = (BASE_X + 0.026) * S, gap = 0.0155 * S;
    c.strokeStyle = hexA(L, 0.95); c.lineWidth = lw; c.beginPath(); c.moveTo(-half, by - gap); c.lineTo(half, by - gap); c.moveTo(-half, by + gap); c.lineTo(half, by + gap); c.stroke();
    for (const sx of [-1, 1]) { const ex = sx * half; c.beginPath(); c.arc(ex, by, gap, 0, 7); c.fillStyle = st.ring; c.fill(); c.lineWidth = lw; c.strokeStyle = hexA(L, 0.95); c.stroke(); c.beginPath(); c.arc(ex, by, gap * 0.45, 0, 7); c.fillStyle = shade(st.ring, -0.3); c.fill(); }
    c.restore();
  }
  // diagonal arrows from each pocket towards the centre, ending in a bow
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    c.save(); c.translate(X(sx * (HB - PK_IN)), Y(sy * (HB - PK_IN))); c.rotate(Math.atan2(sy, -sx));
    const d0 = 0.078 * S, d1 = 0.2 * S, br = 0.032 * S; c.strokeStyle = hexA(L, 0.95); c.lineWidth = lw; c.beginPath(); c.moveTo(d0, 0); c.lineTo(d1, 0); c.stroke();
    c.beginPath(); c.arc(d1 - 0.012 * S, 0, br, -1.0, 1.0); c.stroke(); c.beginPath(); c.arc(d1 - 0.012 * S, 0, br + 0.006 * S, -0.9, 0.9); c.stroke();
    c.beginPath(); c.arc(d0 - 0.006 * S, 0, 0.0085 * S, 0, 7); c.fillStyle = st.ring; c.fill(); c.lineWidth = lw * 0.8; c.stroke();
    c.restore();
  }
  // centre motif
  { c.save(); c.translate(ox, oy); const R0 = 0.0715 * S;
    c.strokeStyle = hexA(L, 0.95); c.lineWidth = lw; c.beginPath(); c.arc(0, 0, R0, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, R0 * 0.62, 0, 7); c.stroke();
    switch (st.motif) {
      case 'flower': for (let i = 0; i < 12; i++) { c.save(); c.rotate((i * Math.PI) / 6); c.beginPath(); c.moveTo(R0 * 0.2, 0); c.quadraticCurveTo(R0 * 0.55, -R0 * 0.2, R0 * 0.62, 0); c.quadraticCurveTo(R0 * 0.55, R0 * 0.2, R0 * 0.2, 0); c.fillStyle = hexA(st.ring, 0.85); c.fill(); c.lineWidth = 0.4; c.strokeStyle = hexA(L, 0.8); c.stroke(); c.restore(); } break;
      case 'sun': for (let i = 0; i < 16; i++) { c.save(); c.rotate((i * Math.PI) / 8); const l = i % 2 ? R0 * 0.8 : R0 * 0.95; c.beginPath(); c.moveTo(R0 * 0.64, -R0 * 0.07); c.lineTo(l, 0); c.lineTo(R0 * 0.64, R0 * 0.07); c.closePath(); c.fillStyle = hexA(st.ring, i % 2 ? 0.6 : 0.9); c.fill(); c.restore(); } break;
      case 'lotus': for (let i = 0; i < 8; i++) { c.save(); c.rotate((i * Math.PI) / 4); c.beginPath(); c.moveTo(R0 * 0.25, 0); c.quadraticCurveTo(R0 * 0.45, -R0 * 0.3, R0 * 0.95, 0); c.quadraticCurveTo(R0 * 0.45, R0 * 0.3, R0 * 0.25, 0); c.fillStyle = hexA(st.ring, 0.55); c.fill(); c.lineWidth = 0.5; c.strokeStyle = hexA(L, 0.9); c.stroke(); c.restore(); } break;
      case 'star': c.beginPath(); for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, r = i % 2 ? R0 * 0.34 : R0 * 0.95; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = hexA(st.ring, 0.7); c.fill(); c.lineWidth = 0.5; c.strokeStyle = hexA(L, 0.9); c.stroke(); break;
      case 'ring': c.beginPath(); c.arc(0, 0, R0 * 0.82, 0, 7); c.lineWidth = lw * 2.2; c.strokeStyle = hexA(st.ring, 0.9); c.stroke(); break;
      default: break;
    }
    c.beginPath(); c.arc(0, 0, 0.0158 * S, 0, 7); c.fillStyle = st.ring; c.fill(); c.lineWidth = lw; c.strokeStyle = hexA(L, 0.95); c.stroke(); c.restore(); }
  c.restore();

  /* ---- pockets: a hole with a hatched net and a brass ring */
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const cx = X(sx * (HB - PK_IN)), cy = Y(sy * (HB - PK_IN)), rv = PK_R * pk * 0.95 * S;
    c.save(); c.beginPath(); c.arc(cx, cy, rv + 0.0075 * S, 0, 7); const rg = c.createLinearGradient(cx - rv, cy - rv, cx + rv, cy + rv); rg.addColorStop(0, shade(st.trim, 0.4)); rg.addColorStop(0.5, st.trim); rg.addColorStop(1, shade(st.trim, -0.5)); c.fillStyle = rg; c.fill(); c.lineWidth = 0.6; c.strokeStyle = 'rgba(0,0,0,0.7)'; c.stroke();
    c.beginPath(); c.arc(cx, cy, rv, 0, 7); const hg = c.createRadialGradient(cx - rv * 0.15, cy - rv * 0.2, rv * 0.1, cx, cy, rv); hg.addColorStop(0, '#000'); hg.addColorStop(0.75, st.pocket); hg.addColorStop(1, shade(st.pocket, 0.3)); c.fillStyle = hg; c.fill();
    c.save(); c.beginPath(); c.arc(cx, cy, rv, 0, 7); c.clip(); c.strokeStyle = hexA(st.net, 0.55); c.lineWidth = 0.4; const step = rv / 3.2; for (let k = -6; k <= 6; k++) { c.beginPath(); c.moveTo(cx + k * step - rv, cy - rv); c.lineTo(cx + k * step + rv, cy + rv); c.moveTo(cx + k * step + rv, cy - rv); c.lineTo(cx + k * step - rv, cy + rv); c.stroke(); } c.restore();
    c.beginPath(); c.arc(cx, cy, rv, Math.PI * 0.95, Math.PI * 1.7); c.lineWidth = 0.8; c.strokeStyle = 'rgba(255,255,255,0.22)'; c.stroke(); c.restore();
  }
  // final sheen over the whole board
  c.save(); frame(); c.clip(); const sh = c.createLinearGradient(fx0, fy0, fx0 + fw * 0.5, fy0 + fw * 0.7); sh.addColorStop(0, 'rgba(255,255,255,0.09)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sh; c.fillRect(fx0, fy0, fw, fw); c.restore();
  const art: BoardArt = { cv, w, h, ox, oy, S }; if (cache.size > 24) cache.clear(); cache.set(key, art); return art;
}
export function clearBoardCache() { cache.clear(); }
