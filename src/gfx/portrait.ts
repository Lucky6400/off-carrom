/* Cartoon bust portraits painted from a Look (skin, hair, outfit, accessories), then baked to hard-edged pixel sprites with an outline.
   Designed in a 100 x 120 space and scaled to the requested size. */
import type { CharDef, Look, FaceShape } from '../data/characters.js';
import { charById } from '../data/characters.js';
import { shade, mixHex } from '../util.js';
import { hi } from './hires.js';
import { view } from '../config.js';

export type Expr = 'normal' | 'happy' | 'sad' | 'shock' | 'cheer';
const cache = new Map<string, HTMLCanvasElement>();

type P = CanvasRenderingContext2D;
const path = (c: P, pts: [number, number][], close = true) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); if (close) c.closePath(); };
const ell = (c: P, x: number, y: number, rx: number, ry: number, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };
const fillStroke = (c: P, fill: string | CanvasGradient, line?: string, lw = 1.4) => { c.fillStyle = fill; c.fill(); if (line) { c.strokeStyle = line === '#2a1230' ? '#3a2018' : line; c.lineWidth = lw * 0.34; c.lineJoin = 'round'; c.stroke(); } };
let HC = '#2a1a10';
/** hair-like fill: the colour plus fine curved strands (light and dark) clipped to the shape, so hair and beards read as hair */
function fillHair(c: P, fill: string | CanvasGradient, ol?: string, lw = 1.2, vertical = false) {
  fillStroke(c, fill, ol, lw);
  c.save(); c.clip(); c.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const r1 = Math.sin(i * 12.9898) * 43758.5453, a = r1 - Math.floor(r1), r2 = Math.sin(i * 78.233) * 12345.6789, b = r2 - Math.floor(r2), x = 14 + a * 72, y0 = vertical ? 38 + b * 36 : 4 + b * 22, len = vertical ? 8 + b * 10 : 22 + a * 26, bend = (a - 0.5) * 10;
    c.strokeStyle = i % 3 === 0 ? 'rgba(255,255,255,0.22)' : i % 3 === 1 ? shade(HC, -0.45) : shade(HC, 0.25); c.globalAlpha = i % 3 === 0 ? 0.35 : 0.3; c.lineWidth = 0.55;
    c.beginPath(); c.moveTo(x, y0); c.quadraticCurveTo(x + bend, y0 + len * 0.5, x + bend * 1.6 + (x < 50 ? -3 : 3), y0 + len); c.stroke();
  }
  c.globalAlpha = 1; c.restore();
}
function lin(c: P, y0: number, y1: number, a: string, b: string): CanvasGradient { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function hlin(c: P, x0: number, x1: number, a: string, b: string): CanvasGradient { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, a); g.addColorStop(1, b); return g; }

export function portrait(id: string, w = 60, h = 72, expr: Expr = 'normal', bg = false): HTMLCanvasElement {
  const key = `${id}|${w}|${h}|${expr}|${bg}|${view.rs}`, hit = cache.get(key); if (hit) return hit;
  const ch = charById(id), L = ch.look, { cv, ctx: c } = hi(w, h);
  c.save(); c.scale(w / 100, h / 120);
  if (bg) { c.fillStyle = lin(c, 0, 120, L.bg[0], L.bg[1]); c.fillRect(0, 0, 100, 120); c.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 9; i++) { const a = i * 0.7; c.beginPath(); c.moveTo(50, 60); c.lineTo(50 + Math.cos(a) * 120, 60 + Math.sin(a) * 120); c.lineTo(50 + Math.cos(a + 0.18) * 120, 60 + Math.sin(a + 0.18) * 120); c.fill(); } }
  drawBust(c, L, expr, ch);
  c.restore();
  const out = cv;
  cache.set(key, out); return out;
}
/** round avatar (HUD / scoreboard): portrait head inside a framed circle */
export function avatar(id: string, size = 26, expr: Expr = 'normal', ring = '#f2bd87'): HTMLCanvasElement {
  const key = `av|${id}|${size}|${expr}|${ring}|${view.rs}`, hit = cache.get(key); if (hit) return hit;
  const L = charById(id).look, { cv, ctx: c } = hi(size, size), s = size / 100;
  c.save(); c.beginPath(); c.arc(size / 2, size / 2, size / 2 - 1.2, 0, Math.PI * 2); c.clip();
  c.fillStyle = lin(c, 0, size, L.bg[0], L.bg[1]); c.fillRect(0, 0, size, size);
  c.scale(s * 1.45, s * 1.45); c.translate(-18, -6); drawBust(c, L, expr, charById(id)); c.restore();
  c.strokeStyle = '#261809'; c.lineWidth = 2.4; c.beginPath(); c.arc(size / 2, size / 2, size / 2 - 1.2, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = ring; c.lineWidth = 1.4; c.beginPath(); c.arc(size / 2, size / 2, size / 2 - 1.2, 0, Math.PI * 2); c.stroke();
  cache.set(key, cv); return cv;
}

/** skull / face outline per face shape, in multiples of the half-width hw (right side, top to chin): temple, cheekbone, jaw angle, chin.
    The outline is a closed Catmull-Rom curve through those landmarks, so cheekbones, the jaw angle and the chin read like a real head. `jawK` is how sharp the jaw corner is (0 = angular). */
interface FaceDef { w: number; temple: number; cheek: number; cheekY: number; jaw: number; jawY: number; jawK: number; chinW: number; chin: number }
const FACES: Record<FaceShape, FaceDef> = {
  oval: { w: 0.92, temple: 1.0, cheek: 1.03, cheekY: 51, jaw: 0.82, jawY: 67, jawK: 1, chinW: 0.34, chin: 80 },
  round: { w: 0.98, temple: 1.0, cheek: 1.06, cheekY: 54, jaw: 0.9, jawY: 69, jawK: 1, chinW: 0.44, chin: 78 },
  square: { w: 0.94, temple: 0.98, cheek: 1.0, cheekY: 50, jaw: 0.92, jawY: 68, jawK: 0.45, chinW: 0.44, chin: 81 },
  long: { w: 0.84, temple: 0.98, cheek: 1.0, cheekY: 52, jaw: 0.86, jawY: 73, jawK: 0.7, chinW: 0.4, chin: 87 },
  heart: { w: 0.95, temple: 1.03, cheek: 1.06, cheekY: 50, jaw: 0.64, jawY: 66, jawK: 1, chinW: 0.2, chin: 82 },
  diamond: { w: 0.9, temple: 0.9, cheek: 1.1, cheekY: 52, jaw: 0.68, jawY: 67, jawK: 1, chinW: 0.25, chin: 82 },
};
type KP = [number, number, number];
function headPts(fs: FaceDef, hw: number, fem: boolean): KP[] {
  const j = fs.jaw * (fem ? 0.93 : 1), cw = fs.chinW * (fem ? 0.88 : 1), ch = fs.chin - (fem ? 1 : 0);
  const R: KP[] = [[0, 18.5, 1], [0.52, 20.3, 1], [0.87, 27.5, 1], [fs.temple, 39, 1], [fs.cheek, fs.cheekY, 1], [j, fs.jawY, fs.jawK], [(j + cw) / 2 + 0.03, (fs.jawY + ch) / 2 + 2.5, 1], [cw, ch - 1.2, 1], [cw * 0.4, ch + 0.4, 1], [0, ch + 0.7, 1]];
  const out: KP[] = R.map(([x, y, k]) => [50 + x * hw, y, k]);
  for (let i = R.length - 2; i >= 1; i--) out.push([50 - R[i][0] * hw, R[i][1], R[i][2]]);
  return out;
}
function smooth(c: P, pts: KP[]) {
  const n = pts.length; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    c.bezierCurveTo(p1[0] + ((p2[0] - p0[0]) / 6) * p1[2], p1[1] + ((p2[1] - p0[1]) / 6) * p1[2], p2[0] - ((p3[0] - p1[0]) / 6) * p2[2], p2[1] - ((p3[1] - p1[1]) / 6) * p2[2], p2[0], p2[1]);
  }
  c.closePath();
}
function drawBust(c: P, L: Look, expr: Expr, ch: CharDef) {
  HC = L.hairCol;
  const skin = L.skin, skinSh = shade(skin, -0.2), skinHi = shade(skin, 0.15), wide = L.wide ?? 1, fs = FACES[L.face ?? 'oval'], hs = (L.head ?? 1) * fs.w, ol = '#2a1230', fem = !!L.female;
  const cx = 50, hw = 24 * hs, chin = fs.chin - (fem ? 1 : 0), jaw = (fs.jaw * (fem ? 0.93 : 1) * hw) / 16, tilt = L.tilt ?? 0;
  /** the head (and everything on it) leans a little around the base of the neck: attitude */
  const lean = (fn: () => void) => { c.save(); c.translate(cx, 78); c.rotate(tilt); c.translate(-cx, -78); fn(); c.restore(); };
  c.lineJoin = 'round'; c.lineCap = 'round';
  /* ---- hair back layer ---- */
  lean(() => hairBack(c, L, ol));
  /* ---- torso ---- */
  torso(c, L, wide, ol);
  /* ---- neck: tapers in below the jaw and flares into the trapezius ---- */
  const neck = () => { c.beginPath(); c.moveTo(cx - 9.8, 60); c.bezierCurveTo(cx - 9, 76, cx - 11, 84, cx - 15, 93); c.lineTo(cx + 15, 93); c.bezierCurveTo(cx + 11, 84, cx + 9, 76, cx + 9.8, 60); c.closePath(); };
  neck(); fillStroke(c, hlin(c, cx - 14, cx + 14, skinHi, skinSh), ol, 1.3);
  c.save(); neck(); c.clip();
  c.fillStyle = 'rgba(70,25,15,0.42)'; ell(c, cx + 1.5, chin + 1, hw * 0.78, 11, 0); c.fill();
  c.strokeStyle = 'rgba(70,25,15,0.2)'; c.lineWidth = 1; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * 6, chin + 2); c.quadraticCurveTo(cx + s * 7, 84, cx + s * 3, 92); c.stroke(); }
  c.restore();
  if (L.extra === 'chain') { c.strokeStyle = '#ffd23a'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 12, 88); c.quadraticCurveTo(cx, 104, cx + 12, 88); c.stroke(); ell(c, cx, 100, 2.6, 3, 0); fillStroke(c, '#fff0a0', '#a06a00', 1); }
  collar(c, L, wide, ol);
  lean(() => {
    /* ---- ears: outer rim, lobe and the inner fold ---- */
    for (const sx of [-1, 1]) {
      const ex = cx + sx * (hw + 0.6);
      c.beginPath(); c.moveTo(ex - sx * 1.6, 39.5); c.bezierCurveTo(ex + sx * 5.4, 37.5, ex + sx * 6.6, 49, ex + sx * 2.6, 56.5); c.bezierCurveTo(ex + sx * 0.6, 59, ex - sx * 1.2, 56, ex - sx * 1.6, 53); c.closePath(); fillStroke(c, skin, ol, 1.2);
      c.strokeStyle = skinSh; c.lineWidth = 0.75; c.beginPath(); c.moveTo(ex + sx * 0.6, 43.5); c.quadraticCurveTo(ex + sx * 3.8, 43.5, ex + sx * 3, 50.5); c.stroke();
    }
    if (L.extra === 'earring') { const ex = cx - (hw + 2.3); ell(c, ex, 59.5, 1.8, 2.3, 0); fillStroke(c, '#ffd23a', '#8a5a00', 0.9); }
    /* ---- head ---- */
    smooth(c, headPts(fs, hw, fem));
    fillStroke(c, hlin(c, cx - hw, cx + hw, skinHi, skin), ol, 1.5);
    c.save(); c.clip();
    const sg = c.createLinearGradient(cx - hw, 0, cx + hw, 0); sg.addColorStop(0, 'rgba(255,240,220,0.14)'); sg.addColorStop(0.45, 'rgba(255,255,255,0)'); sg.addColorStop(0.8, 'rgba(90,30,20,0.12)'); sg.addColorStop(1, 'rgba(90,30,20,0.30)'); c.fillStyle = sg; c.fillRect(cx - hw - 2, 10, hw * 2 + 4, 90);
    const jg = c.createLinearGradient(0, chin - 14, 0, chin + 2); jg.addColorStop(0, 'rgba(90,30,20,0)'); jg.addColorStop(1, 'rgba(90,30,20,0.24)'); c.fillStyle = jg; c.fillRect(cx - hw - 2, chin - 14, hw * 2 + 4, 16);
    const fh = c.createRadialGradient(cx - 6, 30, 1, cx - 6, 30, 14); fh.addColorStop(0, 'rgba(255,245,230,0.22)'); fh.addColorStop(1, 'rgba(255,245,230,0)'); c.fillStyle = fh; c.fillRect(cx - 24, 16, 36, 30);
    const hg = c.createLinearGradient(0, 25, 0, 38); hg.addColorStop(0, 'rgba(70,20,20,0)'); hg.addColorStop(0.35, 'rgba(70,20,20,0.15)'); hg.addColorStop(1, 'rgba(70,20,20,0)'); c.fillStyle = hg; c.fillRect(cx - 30, 25, 60, 13);
    for (const s of [-1, 1]) { // cheekbone light, jaw (masseter) shade and the temple hollow
      const g1 = c.createRadialGradient(cx + s * hw * 0.58, 52, 1, cx + s * hw * 0.58, 52, 9); g1.addColorStop(0, `rgba(255,248,235,${s < 0 ? 0.2 : 0.1})`); g1.addColorStop(1, 'rgba(255,248,235,0)'); c.fillStyle = g1; c.fillRect(cx + s * hw * 0.58 - 10, 42, 20, 20);
      const g2 = c.createRadialGradient(cx + s * hw * 0.84, 63, 1, cx + s * hw * 0.84, 63, 10); g2.addColorStop(0, `rgba(80,25,15,${fem ? 0.08 : 0.15})`); g2.addColorStop(1, 'rgba(80,25,15,0)'); c.fillStyle = g2; c.fillRect(cx + s * hw * 0.84 - 11, 52, 22, 22);
    }
    const cg = c.createRadialGradient(cx, chin - 5, 0.5, cx, chin - 5, 6); cg.addColorStop(0, 'rgba(255,245,230,0.16)'); cg.addColorStop(1, 'rgba(255,245,230,0)'); c.fillStyle = cg; c.fillRect(cx - 7, chin - 12, 14, 14);
    c.restore();
    /* ---- beard (under mouth features) ---- */
    if (L.beard) beard(c, L, hs, jaw, chin);
    /* ---- face ---- */
    face(c, L, expr, hs, fem);
    if (L.extra === 'scar') { c.strokeStyle = '#a04a4a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx + 12, 31); c.lineTo(cx + 19, 56); c.stroke(); c.strokeStyle = '#ffd0d0'; c.lineWidth = 0.6; for (const t of [38, 46, 52]) { c.beginPath(); c.moveTo(cx + 12 + (t - 31) * 0.28 - 2, t); c.lineTo(cx + 12 + (t - 31) * 0.28 + 2, t); c.stroke(); } }
    /* ---- hair front, accessories ---- */
    hairFront(c, L, hs, ol);
    glasses(c, L, hs);
    hat(c, L, hs, ol);
    if (L.extra === 'patch') { ell(c, cx - 13, 44, 6, 5, 0); fillStroke(c, '#1a1a22', '#000', 1); }
  });
  pose(c, L, wide, chin);
  void ch;
}

function torso(c: P, L: Look, wide: number, ol: string) {
  const cx = 50, sw = 44 * wide, top = 88, shirt = L.shirt, s2 = L.shirt2;
  const shell = (fill: string | CanvasGradient) => { c.beginPath(); c.moveTo(cx - sw, 124); c.lineTo(cx - sw, top + 10); c.bezierCurveTo(cx - sw, top - 2, cx - 22, top - 4, cx - 12, top - 2); c.lineTo(cx + 12, top - 2); c.bezierCurveTo(cx + 22, top - 4, cx + sw, top - 2, cx + sw, top + 10); c.lineTo(cx + sw, 124); c.closePath(); fillStroke(c, fill, ol, 1.5); };
  const shaded = hlin(c, cx - sw, cx + sw, shade(shirt, 0.12), shade(shirt, -0.18));
  if (L.extra === 'cape') { shell(shade(shirt, -0.3)); }
  switch (L.top) {
    case 'tank': {
      c.beginPath(); c.moveTo(cx - sw + 6, 124); c.lineTo(cx - sw + 2, top + 12); c.bezierCurveTo(cx - sw, top, cx - 22, top - 2, cx - 12, top - 2); c.lineTo(cx + 12, top - 2); c.bezierCurveTo(cx + 22, top - 2, cx + sw, top, cx + sw - 2, top + 12); c.lineTo(cx + sw - 6, 124); c.closePath(); fillStroke(c, L.skin, ol, 1.5); // bare shoulders
      path(c, [[cx - 24, top + 2], [cx - 16, top - 1], [cx - 13, top + 8], [cx - 2, top + 10], [cx + 2, top + 10], [cx + 13, top + 8], [cx + 16, top - 1], [cx + 24, top + 2], [cx + 30, 124], [cx - 30, 124]]); fillStroke(c, shaded, ol, 1.4);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(cx - 24, 104, 48, 2); break;
    }
    case 'jersey': {
      shell(shaded); path(c, [[cx - 14, top - 2], [cx - sw, top + 10], [cx - sw, top + 18], [cx - 22, top + 6]]); c.fillStyle = s2; c.fill(); path(c, [[cx + 14, top - 2], [cx + sw, top + 10], [cx + sw, top + 18], [cx + 22, top + 6]]); c.fillStyle = s2; c.fill();
      path(c, [[cx - 11, top - 2], [cx, top + 12], [cx + 11, top - 2]]); fillStroke(c, s2, ol, 1.2);
      if (L.num) { c.fillStyle = s2; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText(L.num, cx, 116); } break;
    }
    case 'hoodie': { shell(shaded); path(c, [[cx - 16, top - 2], [cx - 12, top + 16], [cx, top + 22], [cx + 12, top + 16], [cx + 16, top - 2]]); fillStroke(c, shade(shirt, -0.3), ol, 1.3); path(c, [[cx - 8, top - 2], [cx, top + 12], [cx + 8, top - 2]]); c.fillStyle = L.skin; c.fill(); c.strokeStyle = s2; c.lineWidth = 1.6; for (const sx of [-5, 5]) { c.beginPath(); c.moveTo(cx + sx, top + 12); c.lineTo(cx + sx, top + 28); c.stroke(); } break; }
    case 'jacket': { shell(shaded); path(c, [[cx - 14, top - 2], [cx, top + 14], [cx + 14, top - 2], [cx + 10, 124], [cx - 10, 124]]); fillStroke(c, s2, ol, 1.2); c.strokeStyle = shade(shirt, -0.3); c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx, top + 14); c.lineTo(cx, 124); c.stroke(); path(c, [[cx - 14, top - 2], [cx - 4, top + 16], [cx - 20, top + 18]]); fillStroke(c, shade(shirt, 0.15), ol, 1.2); path(c, [[cx + 14, top - 2], [cx + 4, top + 16], [cx + 20, top + 18]]); fillStroke(c, shade(shirt, -0.1), ol, 1.2); break; }
    case 'suit': case 'suit2': { shell(shaded); path(c, [[cx - 12, top - 2], [cx, top + 22], [cx + 12, top - 2]]); fillStroke(c, '#f2f2f8', ol, 1.2); path(c, [[cx - 14, top - 2], [cx - 2, top + 20], [cx - 18, top + 24], [cx - 26, top + 6]]); fillStroke(c, shade(shirt, 0.08), ol, 1.2); path(c, [[cx + 14, top - 2], [cx + 2, top + 20], [cx + 18, top + 24], [cx + 26, top + 6]]); fillStroke(c, shade(shirt, -0.08), ol, 1.2); if (L.top === 'suit2') { path(c, [[cx - 8, top + 4], [cx, top + 8], [cx - 8, top + 12]]); fillStroke(c, s2, ol, 1); path(c, [[cx + 8, top + 4], [cx, top + 8], [cx + 8, top + 12]]); fillStroke(c, s2, ol, 1); } else if (L.extra === 'tie') { path(c, [[cx - 3, top + 4], [cx + 3, top + 4], [cx + 5, 112], [cx, 118], [cx - 5, 112]]); fillStroke(c, s2, ol, 1); } break; }
    case 'dress': { shell(shaded); ell(c, cx, top - 2, 15, 9, 0); fillStroke(c, L.skin, ol, 1.3); path(c, [[cx - 14, top - 4], [cx - 30, top + 8], [cx - 20, top + 18], [cx, top + 12], [cx + 20, top + 18], [cx + 30, top + 8], [cx + 14, top - 4]]); c.fillStyle = shaded; c.globalCompositeOperation = 'source-over'; c.fill(); c.strokeStyle = s2; c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx - 20, top + 18); c.quadraticCurveTo(cx, top + 14, cx + 20, top + 18); c.stroke(); break; }
    case 'armor': { shell(shaded); for (const sx of [-1, 1]) { ell(c, cx + sx * 36, top + 8, 12, 9, sx * 0.4); fillStroke(c, s2, ol, 1.4); ell(c, cx + sx * 36, top + 6, 7, 4, sx * 0.4); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fill(); } path(c, [[cx - 16, top], [cx, top + 18], [cx + 16, top], [cx + 12, 118], [cx - 12, 118]]); fillStroke(c, s2, ol, 1.3); ell(c, cx, top + 22, 5, 5, 0); fillStroke(c, '#ecaf53', ol, 1); break; }
    case 'vest': { shell(shaded); path(c, [[cx - 14, top - 2], [cx, top + 18], [cx + 14, top - 2], [cx + 22, 124], [cx - 22, 124]]); fillStroke(c, s2, ol, 1.2); path(c, [[cx - 10, top - 2], [cx - 8, 124], [cx - 22, 124], [cx - 24, top + 4]]); fillStroke(c, shade(shirt, 0.06), ol, 1.2); path(c, [[cx + 10, top - 2], [cx + 8, 124], [cx + 22, 124], [cx + 24, top + 4]]); fillStroke(c, shade(shirt, -0.1), ol, 1.2); break; }
    default: { shell(shaded); path(c, [[cx - 12, top - 2], [cx, top + 12], [cx + 12, top - 2]]); c.fillStyle = L.skin; c.fill(); }
  }
  if (L.extra === 'towel') { path(c, [[cx - 27, top + 2], [cx - 14, top - 8], [cx - 6, top + 14], [cx - 8, 124], [cx - 24, 124], [cx - 30, top + 12]]); fillStroke(c, '#f4f8ff', ol, 1.3); c.strokeStyle = '#9ab0e0'; c.lineWidth = 1; for (const y of [102, 112]) { c.beginPath(); c.moveTo(cx - 27, y); c.lineTo(cx - 9, y); c.stroke(); } path(c, [[cx + 14, top - 6], [cx + 27, top + 2], [cx + 30, top + 12], [cx + 22, top + 6]]); fillStroke(c, '#f4f8ff', ol, 1.3); }
}
function collar(c: P, L: Look, wide: number, ol: string) {
  const cx = 50, top = 88; void wide;
  if (L.top === 'tee') { c.beginPath(); c.moveTo(cx - 14, top - 3); c.quadraticCurveTo(cx, top + 14, cx + 14, top - 3); c.strokeStyle = shade(L.shirt, -0.35); c.lineWidth = 2.4; c.stroke(); c.fillStyle = L.skin; c.beginPath(); c.moveTo(cx - 12, top - 3); c.quadraticCurveTo(cx, top + 11, cx + 12, top - 3); c.fill(); }
  void ol;
}
function beard(c: P, L: Look, hs: number, jaw: number, chin: number) {
  const cx = 50, col = L.hairCol, hw = 24 * hs;
  if (L.beard === 'stubble') { c.save(); c.beginPath(); c.moveTo(cx - hw + 1, 44); c.bezierCurveTo(cx - hw, 62, cx - 16 * jaw, chin - 1, cx, chin - 1); c.bezierCurveTo(cx + 16 * jaw, chin - 1, cx + hw, 62, cx + hw - 1, 44); c.lineTo(cx + 14, 56); c.quadraticCurveTo(cx, 60, cx - 14, 56); c.closePath(); c.fillStyle = col; c.globalAlpha = 0.2; c.fill(); c.globalAlpha = 0.12; c.fillStyle = shade(col, 0.3); for (let i = 0; i < 90; i++) { const x = cx - 20 + ((i * 37) % 40), y = 50 + ((i * 53) % 26); c.fillRect(x, y, 0.8, 0.8); } c.restore(); return; }
  if (L.beard === 'full') { c.beginPath(); c.moveTo(cx - hw, 42); c.bezierCurveTo(cx - hw - 1, 66, cx - 14, chin + 6, cx, chin + 6); c.bezierCurveTo(cx + 14, chin + 6, cx + hw + 1, 66, cx + hw, 42); c.lineTo(cx + 16, 52); c.quadraticCurveTo(cx, 58, cx - 16, 52); c.closePath(); fillHair(c, col, '#14080a', 1.2, true); return; }
  if (L.beard === 'goatee') { c.beginPath(); c.moveTo(cx - 8.5, chin - 14); c.quadraticCurveTo(cx, chin - 18, cx + 8.5, chin - 14); c.lineTo(cx + 5.5, chin + 1); c.quadraticCurveTo(cx, chin + 6, cx - 5.5, chin + 1); c.closePath(); fillHair(c, col, '#14080a', 1, true); }
}
/** facial attitude: eyelid droop, smirk lift of the near mouth corner, extra lift of the far brow, angry inner brow, open grin */
interface Att { droop: number; sm: number; bl: number; br: number; ang: number; grin?: boolean }
const ATT: Record<string, Att> = {
  neutral: { droop: 0, sm: 0.9, bl: 0, br: 0, ang: 0 },
  smirk: { droop: 0.24, sm: 2.1, bl: 1.8, br: 0, ang: 0 },
  smug: { droop: 0.4, sm: 1.6, bl: 2.6, br: -0.3, ang: 0 },
  cool: { droop: 0.3, sm: 0.7, bl: 0, br: 0, ang: 0 },
  grin: { droop: 0.08, sm: 1.2, bl: 0.9, br: 0.9, ang: 0, grin: true },
  stern: { droop: 0.14, sm: -0.5, bl: 0, br: 0, ang: 1.9 },
};
function face(c: P, L: Look, expr: Expr, hs: number, fem: boolean) {
  const cx = 50, ey = 45, ex = 10.6 * hs, skin = L.skin, dk = shade(skin, -0.5), eyeCol = L.eye;
  const browCol = L.hairCol === '#e8f4ff' || L.hairCol === '#dcdcc8' || L.hairCol === '#c8c8c8' ? '#8a8a98' : shade(L.hairCol, -0.15);
  const tn = L.turn ?? 0, ts = tn < 0 ? -1 : 1, A = expr === 'normal' ? ATT[L.att ?? 'neutral'] : ATT.neutral;
  c.save(); c.translate(tn * 3.2, 0); // the face is turned a little; the eyes stay on us
  // cheekbone shading gives the face structure
  c.save(); for (const s of [-1, 1]) { const g = c.createRadialGradient(cx + s * 17, ey + 13, 1, cx + s * 17, ey + 13, 13); g.addColorStop(0, fem ? 'rgba(255,110,130,0.20)' : 'rgba(120,50,30,0.14)'); g.addColorStop(1, 'rgba(255,110,130,0)'); c.fillStyle = g; c.fillRect(cx + s * 17 - 14, ey, 28, 28); } c.restore();
  // eye sockets
  c.save(); for (const s of [-1, 1]) { const g = c.createRadialGradient(cx + s * ex, ey - 1, 1, cx + s * ex, ey - 1, 10); g.addColorStop(0, 'rgba(110,50,35,0.2)'); g.addColorStop(1, 'rgba(110,50,35,0)'); c.fillStyle = g; c.fillRect(cx + s * ex - 11, ey - 12, 22, 22); } c.restore();
  // brows: arched and tapered, the far one lifts for a smug look, the inner ends drop for a glare
  const lift = expr === 'cheer' || expr === 'shock' ? 2.2 : expr === 'sad' ? -0.6 : 0;
  for (const s of [-1, 1]) {
    const lf = lift + (s === -ts ? A.bl : A.br), x0 = cx + s * (ex + 7.2), x1 = cx + s * (ex - 6.2), by = ey - 9.6 - lf, th = fem ? 1.1 : 1.9, iy = by + 1.2 + A.ang, oy = by + (expr === 'sad' ? -0.4 : 1.4) - A.ang * 0.3, pk = by - 2.6 - (fem ? 1 : 0) - (lf > 2 ? 0.6 : 0);
    c.beginPath(); c.moveTo(x1, iy); c.quadraticCurveTo((x0 + x1) / 2 - s * 1, pk, x0, oy); c.quadraticCurveTo((x0 + x1) / 2 - s * 1, pk + th, x1, iy + th); c.closePath(); c.fillStyle = browCol; c.fill();
  }
  // eyes: almond shaped; heavy lids give the attitude; pupils swing back to look at us
  for (const s of [-1, 1]) {
    const far = s === -ts, wk = far ? 0.88 : 1.04, x = cx + s * ex * (far ? 0.95 : 1.02);
    c.save(); c.translate(x, ey); c.scale(wk, 1); c.translate(-x, -ey);
    if (expr === 'happy' || expr === 'cheer') { c.strokeStyle = '#2a1812'; c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 5.4, ey + 1.6); c.quadraticCurveTo(x, ey - 3.6, x + 5.4, ey + 1.6); c.stroke(); }
    else {
      const open = (expr === 'shock' ? 1.25 : expr === 'sad' ? 0.85 : 1) * (1 - A.droop), h1 = 3.9 * open, h2 = 2.6 * (0.55 + open * 0.45);
      const lid = () => { c.beginPath(); c.moveTo(x - 5.8, ey + 0.4); c.bezierCurveTo(x - 3.4, ey - h1 - 0.6, x + 3.4, ey - h1 - 0.6, x + 5.8, ey + 0.2); c.bezierCurveTo(x + 3.2, ey + h2, x - 3.2, ey + h2, x - 5.8, ey + 0.4); c.closePath(); };
      lid(); c.fillStyle = '#f2eeea'; c.fill();
      c.save(); lid(); c.clip();
      const px = x - tn * 0.9, ig = c.createRadialGradient(px - 0.5, ey - 0.8, 0.3, px, ey, 3.2); ig.addColorStop(0, shade(eyeCol, 0.35)); ig.addColorStop(0.65, eyeCol); ig.addColorStop(1, shade(eyeCol, -0.55));
      c.beginPath(); c.arc(px, ey - 0.2 + A.droop * 0.8, 3.1, 0, 7); c.fillStyle = ig; c.fill(); c.beginPath(); c.arc(px, ey - 0.2 + A.droop * 0.8, 1.35, 0, 7); c.fillStyle = '#0c0608'; c.fill();
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(px - 1.1, ey - 1.5 + A.droop * 0.8, 0.85, 0, 7); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(x - 6, ey - h1 - 1, 12, h1 * 0.55);
      c.restore();
      c.strokeStyle = '#2a1410'; c.lineWidth = (fem ? 1.5 : 1.3) + A.droop * 0.9; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 5.8, ey + 0.4); c.bezierCurveTo(x - 3.4, ey - h1 - 0.6, x + 3.4, ey - h1 - 0.6, x + 5.8, ey + 0.2); c.stroke();
      c.strokeStyle = 'rgba(60,20,10,0.35)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x - 4.6, ey - h1 - 1.6); c.quadraticCurveTo(x, ey - h1 - 3.2, x + 4.8, ey - h1 - 1.2); c.stroke();
      c.strokeStyle = 'rgba(80,30,20,0.28)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x - 4.6, ey + h2 + 0.5); c.quadraticCurveTo(x, ey + h2 + 1.5, x + 4.4, ey + h2 + 0.3); c.stroke();
    }
    if (L.lash || fem) { c.strokeStyle = '#1a0a0c'; c.lineWidth = 0.9; c.lineCap = 'round'; for (const [dx, dy, ex2, ey2] of [[4.6, -1.4, 6.8, -3.4], [5.6, 0, 7.8, -1.2], [3.2, -2.6, 4.6, -4.8]]) { c.beginPath(); c.moveTo(x + s * dx, ey + dy); c.lineTo(x + s * ex2, ey + ey2); c.stroke(); } }
    c.restore();
  }
  // nose: bridge, tip and wings, shaded rather than outlined; it swings further than the rest when the face turns
  c.save(); c.translate(tn * 1.4, 0);
  const ng = c.createLinearGradient(cx - 4, 0, cx + 5, 0); ng.addColorStop(0, 'rgba(255,255,255,0)'); ng.addColorStop(0.55, 'rgba(110,50,30,0.22)'); ng.addColorStop(1, 'rgba(110,50,30,0.02)');
  c.beginPath(); c.moveTo(cx - 1.6, ey + 2); c.lineTo(cx + 2.4, ey + 2); c.quadraticCurveTo(cx + 3.6, ey + 11, cx + 4.2, ey + 13); c.lineTo(cx - 3.6, ey + 13); c.quadraticCurveTo(cx - 2, ey + 8, cx - 1.6, ey + 2); c.fillStyle = ng; c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 1; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - 1.2, ey + 3); c.lineTo(cx - 1.6, ey + 10.5); c.stroke();
  c.strokeStyle = dk; c.globalAlpha = 0.45; c.lineWidth = 0.9; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * 2.6, ey + 11.6); c.quadraticCurveTo(cx + s * 6, ey + 11.2, cx + s * 5.2, ey + 14.2); c.stroke(); }
  c.beginPath(); c.moveTo(cx - 4.4, ey + 13.8); c.quadraticCurveTo(cx - 2.2, ey + 15.4, cx, ey + 14.4); c.quadraticCurveTo(cx + 2.2, ey + 15.4, cx + 4.4, ey + 13.8); c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
  c.fillStyle = 'rgba(60,20,10,0.4)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(cx + s * 2.2, ey + 14.4, 1.1, 0.6, 0, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(90,35,25,0.14)'; c.beginPath(); c.ellipse(cx, ey + 17, 5, 1.8, 0, 0, 7); c.fill(); // shadow under the nose
  c.restore();
  // mouth: the near corner lifts for a smirk, the far one dips
  const my = 65, lip = L.lip ?? (fem ? '#c8505e' : shade(skin, -0.22)), lipHi = shade(lip, 0.3);
  const smile = expr === 'happy' || expr === 'cheer' ? 3.6 : expr === 'sad' ? -2.2 : A.sm, asym = expr === 'normal', mw = fem ? 7.6 : 8.2;
  const yn = asym ? my - smile * 0.9 : my - smile * 0.55, yf = asym ? my + smile * 0.15 : my - smile * 0.55, mid = (yn + yf) / 2, Cn = [cx + ts * mw, yn], Cf = [cx - ts * mw, yf];
  const toothy = expr === 'happy' || expr === 'cheer' || (asym && A.grin);
  if (expr === 'shock') { c.beginPath(); c.ellipse(cx, my + 1.5, 4.4, 5.4, 0, 0, 7); c.fillStyle = '#3a0a14'; c.fill(); c.fillStyle = '#e8707e'; c.beginPath(); c.ellipse(cx, my + 4, 2.6, 1.6, 0, 0, 7); c.fill(); c.strokeStyle = lip; c.lineWidth = 1.2; c.beginPath(); c.ellipse(cx, my + 1.5, 4.4, 5.4, 0, 0, 7); c.stroke(); }
  else if (toothy) {
    const dep = asym ? 4.4 : 1.2 + smile, ax = cx + ts * 9, bx = cx - ts * 9, ay = asym ? my - 1.6 : my - 0.6, by = asym ? my - 0.4 : my - 0.6;
    c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(cx, my - 2.8, ax, ay); c.quadraticCurveTo(cx, my + 1.2 + dep, bx, by); c.closePath(); c.fillStyle = '#4a1018'; c.fill();
    c.save(); c.clip(); c.fillStyle = '#fbfaf6'; c.fillRect(cx - 10, my - 3, 20, 4.4); c.restore();
    c.strokeStyle = lip; c.lineWidth = 1.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(cx, my + 1.2 + dep, ax, ay); c.stroke();
    c.strokeStyle = shade(lip, -0.2); c.lineWidth = 0.9; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(cx, my - 2.8, ax, ay); c.stroke();
  } else {
    const lo = (fem ? 6.4 : 5.2) + smile * 0.15;
    c.beginPath(); c.moveTo(Cf[0], Cf[1]); c.quadraticCurveTo(cx - ts * 4.2, mid - 3.4, cx, mid - 1.7); c.quadraticCurveTo(cx + ts * 4.2, mid - 3.4, Cn[0], Cn[1]); c.quadraticCurveTo(cx, mid + 0.9 + smile * 0.15, Cf[0], Cf[1]); c.fillStyle = shade(lip, -0.1); c.fill();
    c.beginPath(); c.moveTo(Cf[0], Cf[1]); c.quadraticCurveTo(cx, mid + 0.9 + smile * 0.15, Cn[0], Cn[1]); c.quadraticCurveTo(cx + ts * 3.4, mid + lo, cx, mid + lo); c.quadraticCurveTo(cx - ts * 3.4, mid + lo, Cf[0], Cf[1]); c.fillStyle = lip; c.fill();
    c.fillStyle = lipHi; c.globalAlpha = 0.45; c.beginPath(); c.ellipse(cx - 0.5, mid + 2.8, 3, 0.9, 0, 0, 7); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = shade(lip, -0.5); c.lineWidth = 0.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(Cf[0] - ts * 0.4, Cf[1] + 0.2); c.quadraticCurveTo(cx, mid + 0.9 + smile * 0.3, Cn[0] + ts * 0.4, Cn[1] - 0.2); c.stroke();
  }
  // the smirk pulls a dimple and a cheek crease out beside the lifted corner; faint nose-to-mouth lines add age and depth
  c.strokeStyle = 'rgba(90,30,20,0.42)'; c.lineWidth = 0.8; c.lineCap = 'round';
  if (asym && A.sm > 0.9) { c.beginPath(); c.moveTo(Cn[0] + ts * 1.4, Cn[1] - 1.8); c.quadraticCurveTo(Cn[0] + ts * 3, Cn[1] + 0.2, Cn[0] + ts * 1.4, Cn[1] + 2.2); c.stroke(); }
  c.strokeStyle = fem ? 'rgba(90,30,20,0.1)' : 'rgba(90,30,20,0.17)'; c.lineWidth = 0.7; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * 5.6, ey + 13.4); c.quadraticCurveTo(cx + s * 10.6, ey + 17, cx + s * 9.6, my - 1.5); c.stroke(); }
  if (L.beard === 'stache') { c.beginPath(); c.moveTo(cx - 12, my - 4); c.quadraticCurveTo(cx - 6, my - 10, cx, my - 5); c.quadraticCurveTo(cx + 6, my - 10, cx + 12, my - 4); c.quadraticCurveTo(cx + 6, my - 2, cx, my - 3); c.quadraticCurveTo(cx - 6, my - 2, cx - 12, my - 4); fillStroke(c, L.hairCol, '#14080a', 1); }
  else if (L.beard === 'goatee') { c.beginPath(); c.moveTo(cx - 9, my - 3); c.quadraticCurveTo(cx, my - 8, cx + 9, my - 3); c.quadraticCurveTo(cx, my - 1, cx - 9, my - 3); fillStroke(c, L.hairCol, '#14080a', 0.8); }
  c.restore();
}
function glasses(c: P, L: Look, hs: number) {
  const cx = 50, ey = 44, ex = 11 * hs;
  if (!L.glasses) return;
  c.save(); c.translate((L.turn ?? 0) * 3.2, 0);
  if (L.glasses === 'round') { c.strokeStyle = '#3a2a18'; c.lineWidth = 1.6; for (const s of [-1, 1]) { ell(c, cx + s * ex, ey, 7.2, 6.4, 0); c.fillStyle = 'rgba(190,230,255,0.22)'; c.fill(); c.stroke(); } c.beginPath(); c.moveTo(cx - ex + 7, ey); c.lineTo(cx + ex - 7, ey); c.stroke(); }
  else if (L.glasses === 'shades') { path(c, [[cx - ex - 8, ey - 6], [cx + ex + 8, ey - 6], [cx + ex + 7, ey + 4], [cx + 2, ey + 6], [cx, ey + 1], [cx - 2, ey + 6], [cx - ex - 7, ey + 4]]); fillStroke(c, hlin(c, cx - 28, cx + 28, '#2a2a3a', '#08080e'), '#000', 1.2); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(cx - ex - 5, ey - 4, 6, 1.6); c.fillRect(cx + 3, ey - 4, 5, 1.6); }
  else if (L.glasses === 'visor') { path(c, [[cx - 25, ey - 7], [cx + 25, ey - 7], [cx + 23, ey + 5], [cx - 23, ey + 5]]); fillStroke(c, hlin(c, cx - 25, cx + 25, 'rgba(234,165,61,0.75)', 'rgba(20,120,255,0.75)'), '#0a3a6a', 1.2); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(cx - 20, ey - 5, 14, 1.6); }
  else { c.strokeStyle = '#d8b030'; c.lineWidth = 1.4; ell(c, cx + ex, ey, 7, 6.4, 0); c.fillStyle = 'rgba(250,233,205,0.25)'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(cx + ex + 6, ey + 4); c.quadraticCurveTo(cx + ex + 16, ey + 20, cx + 22, 84); c.stroke(); }
  c.restore();
}
function hairBack(c: P, L: Look, ol: string) {
  const cx = 50, col = L.hairCol, dk = shade(col, -0.3);
  const fill = () => hlin(c, 20, 80, shade(col, 0.12), dk);
  switch (L.hair) {
    case 'long': c.beginPath(); c.moveTo(cx - 27, 42); c.bezierCurveTo(cx - 30, 2, cx + 30, 2, cx + 27, 42); c.lineTo(cx + 31, 96); c.quadraticCurveTo(cx + 28, 106, cx + 20, 104); c.lineTo(cx - 20, 104); c.quadraticCurveTo(cx - 28, 106, cx - 31, 96); c.closePath(); fillHair(c, fill(), ol, 1.4); break;
    case 'bob': c.beginPath(); c.moveTo(cx - 28, 36); c.bezierCurveTo(cx - 32, 70, cx - 30, 78, cx - 24, 78); c.lineTo(cx + 24, 78); c.bezierCurveTo(cx + 30, 78, cx + 32, 70, cx + 28, 36); c.bezierCurveTo(cx + 24, 6, cx - 24, 6, cx - 28, 36); fillHair(c, fill(), ol, 1.4); break;
    case 'pony': ell(c, cx + 30, 38, 7, 18, -0.3); fillHair(c, fill(), ol, 1.3); path(c, [[cx + 24, 22], [cx + 36, 26], [cx + 40, 60], [cx + 30, 70], [cx + 26, 50]]); fillHair(c, fill(), ol, 1.3); break;
    case 'twin': for (const s of [-1, 1]) { path(c, [[cx + s * 26, 28], [cx + s * 38, 34], [cx + s * 42, 84], [cx + s * 34, 92], [cx + s * 28, 60]]); fillHair(c, fill(), ol, 1.3); ell(c, cx + s * 30, 30, 4, 4, 0); fillHair(c, '#ff5ac8', ol, 1); } break;
    case 'afro': ell(c, cx, 30, 36, 32, 0); fillHair(c, fill(), ol, 1.4); break;
    case 'bun': ell(c, cx, 10, 11, 10, 0); fillHair(c, fill(), ol, 1.3); break;
    case 'side': if (L.female) { path(c, [[cx - 28, 34], [cx - 32, 80], [cx - 20, 92], [cx - 14, 60]]); fillHair(c, fill(), ol, 1.3); } break;
    default: break;
  }
}
function hairFront(c: P, L: Look, hs: number, ol: string) {
  const cx = 50, col = L.hairCol, dk = shade(col, -0.32), hl = shade(col, 0.3), hw = 25 * hs, top = 12;
  const g = () => { const q = c.createLinearGradient(cx - hw, 0, cx + hw, 0); q.addColorStop(0, shade(col, 0.1)); q.addColorStop(1, dk); return q; };
  const cap = (fringe: [number, number][], extra = 0) => { c.beginPath(); c.moveTo(cx - hw - 1, 44); c.bezierCurveTo(cx - hw - 4, 8 - extra, cx + hw + 4, 8 - extra, cx + hw + 1, 44); c.lineTo(cx + hw - 3, 36); fringe.forEach((p) => c.lineTo(p[0], p[1])); c.lineTo(cx - hw + 3, 36); c.closePath(); fillHair(c, g(), ol, 1.4); };
  const shine = () => { c.strokeStyle = hl; c.globalAlpha = 0.5; c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx - 12, 18); c.quadraticCurveTo(cx - 4, 14, cx + 6, 17); c.stroke(); c.globalAlpha = 1; };
  switch (L.hair) {
    case 'bald': { c.fillStyle = 'rgba(255,255,255,0.22)'; ell(c, cx - 6, 20, 9, 4, -0.2); c.fill(); break; }
    case 'short': cap([[cx + 16, 30], [cx + 4, 27], [cx - 10, 31], [cx - 18, 28]]); shine(); break;
    case 'slick': cap([[cx + 14, 28], [cx, 24], [cx - 14, 27], [cx - 20, 30]], 2); shine(); break;
    case 'side': cap([[cx + 18, 33], [cx + 6, 25], [cx - 8, 28], [cx - 18, 36]]); c.strokeStyle = dk; c.lineWidth = 1.1; c.beginPath(); c.moveTo(cx - 6, 14); c.quadraticCurveTo(cx - 8, 22, cx - 4, 27); c.stroke(); shine(); break;
    case 'pixie': cap([[cx + 20, 34], [cx + 4, 26], [cx - 12, 32], [cx - 22, 42]]); break;
    case 'spiky': { c.beginPath(); c.moveTo(cx - hw - 1, 44); c.lineTo(cx - hw - 6, 24); c.lineTo(cx - 18, 20); c.lineTo(cx - 22, 2); c.lineTo(cx - 8, 14); c.lineTo(cx - 6, -6); c.lineTo(cx + 4, 12); c.lineTo(cx + 12, -4); c.lineTo(cx + 16, 14); c.lineTo(cx + 26, 4); c.lineTo(cx + 22, 22); c.lineTo(cx + hw + 6, 24); c.lineTo(cx + hw + 1, 44); c.lineTo(cx + hw - 3, 34); c.lineTo(cx + 12, 28); c.lineTo(cx, 33); c.lineTo(cx - 12, 28); c.lineTo(cx - hw + 3, 34); c.closePath(); fillHair(c, g(), ol, 1.4); break; }
    case 'mohawk': { path(c, [[cx - 7, 28], [cx - 9, 6], [cx - 4, -4], [cx, 4], [cx + 5, -6], [cx + 9, 6], [cx + 7, 28]]); fillHair(c, g(), ol, 1.3); c.fillStyle = shade(col, -0.45); c.globalAlpha = 0.7; c.beginPath(); c.moveTo(cx - hw, 42); c.bezierCurveTo(cx - hw, 18, cx + hw, 18, cx + hw, 42); c.lineTo(cx + hw - 2, 30); c.bezierCurveTo(cx + 10, 22, cx - 10, 22, cx - hw + 2, 30); c.closePath(); c.fill(); c.globalAlpha = 1; break; }
    case 'long': cap([[cx + 18, 40], [cx + 6, 26], [cx - 4, 24], [cx - 18, 40]]); c.strokeStyle = hl; c.globalAlpha = 0.4; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx - 14, 16); c.quadraticCurveTo(cx - 20, 30, cx - 22, 46); c.stroke(); c.globalAlpha = 1; break;
    case 'bob': cap([[cx + 22, 46], [cx + 6, 30], [cx - 8, 28], [cx - 22, 46]]); shine(); break;
    case 'pony': cap([[cx + 18, 32], [cx + 4, 25], [cx - 10, 28], [cx - 20, 38]]); shine(); break;
    case 'twin': cap([[cx + 18, 34], [cx + 2, 24], [cx - 10, 27], [cx - 20, 36]]); shine(); break;
    case 'bun': cap([[cx + 16, 32], [cx + 2, 25], [cx - 12, 29], [cx - 20, 34]]); shine(); break;
    case 'afro': { for (const [x, y, r] of [[-26, 26, 12], [26, 26, 12], [-14, 8, 14], [14, 8, 14], [0, 2, 14]] as number[][]) { ell(c, cx + x, y, r, r, 0); fillHair(c, g(), ol, 1.2); } cap([[cx + 14, 30], [cx, 26], [cx - 14, 30]]); break; }
    case 'curly': { for (const [x, y, r] of [[-24, 26, 9], [24, 26, 9], [-14, 12, 10], [14, 12, 10], [0, 7, 10], [-22, 14, 8], [22, 14, 8]] as number[][]) { ell(c, cx + x, y, r, r, 0); fillHair(c, g(), ol, 1.2); } cap([[cx + 18, 30], [cx + 6, 24], [cx - 6, 28], [cx - 18, 30]]); break; }
  }
  void top;
}
function hat(c: P, L: Look, hs: number, ol: string) {
  const cx = 50, h = L.hat; if (!h) return; const hw = 26 * hs;
  switch (h) {
    case 'phones': { c.strokeStyle = '#1a1a2a'; c.lineWidth = 4.5; c.beginPath(); c.arc(cx, 40, hw + 3, Math.PI * 1.02, Math.PI * 1.98); c.stroke(); c.strokeStyle = '#4a4a6a'; c.lineWidth = 2; c.beginPath(); c.arc(cx, 40, hw + 3, Math.PI * 1.08, Math.PI * 1.9); c.stroke(); for (const s of [-1, 1]) { ell(c, cx + s * (hw + 3), 46, 5.5, 9, 0); fillStroke(c, '#ff3ad8', '#1a1a2a', 1.4); ell(c, cx + s * (hw + 3), 46, 2.6, 5, 0); c.fillStyle = '#7a1a78'; c.fill(); } break; }
    case 'band': { path(c, [[cx - hw - 1, 28], [cx + hw + 1, 28], [cx + hw, 36], [cx - hw, 36]]); fillStroke(c, '#ebac4e', ol, 1.3); c.fillStyle = '#ffffff'; c.fillRect(cx - 3, 29, 6, 6); break; }
    case 'cap': { c.beginPath(); c.moveTo(cx - hw, 34); c.bezierCurveTo(cx - hw, 6, cx + hw, 6, cx + hw, 34); c.closePath(); fillStroke(c, L.shirt2, ol, 1.4); path(c, [[cx - hw + 2, 33], [cx + hw + 14, 36], [cx + hw + 12, 40], [cx - hw + 2, 38]]); fillStroke(c, shade(L.shirt2, -0.25), ol, 1.2); break; }
    case 'beanie': { c.beginPath(); c.moveTo(cx - hw - 1, 36); c.bezierCurveTo(cx - hw - 2, 4, cx + hw + 2, 4, cx + hw + 1, 36); c.closePath(); fillStroke(c, L.shirt2, ol, 1.4); path(c, [[cx - hw - 2, 30], [cx + hw + 2, 30], [cx + hw + 1, 38], [cx - hw - 1, 38]]); fillStroke(c, shade(L.shirt2, -0.2), ol, 1.2); ell(c, cx, 6, 5, 5, 0); fillStroke(c, '#ffffff', ol, 1); break; }
    case 'crown': { path(c, [[cx - 22, 28], [cx - 24, 6], [cx - 12, 18], [cx, 0], [cx + 12, 18], [cx + 24, 6], [cx + 22, 28]]); fillStroke(c, hlin(c, cx - 24, cx + 24, '#fff4a0', '#d8a020'), '#6a4a00', 1.4); for (const [x, y] of [[-24, 6], [0, 0], [24, 6]]) { ell(c, cx + x, y, 2.2, 2.2, 0); fillStroke(c, '#efba6b', '#1a5a8a', 0.8); } break; }
    case 'helmet': { c.beginPath(); c.moveTo(cx - hw - 3, 50); c.bezierCurveTo(cx - hw - 6, -2, cx + hw + 6, -2, cx + hw + 3, 50); c.lineTo(cx + hw - 2, 30); c.bezierCurveTo(cx + 10, 20, cx - 10, 20, cx - hw + 2, 30); c.closePath(); fillStroke(c, hlin(c, cx - 30, cx + 30, '#e8f0ff', '#7a8aaa'), ol, 1.4); break; }
    case 'fedora': { ell(c, cx, 28, hw + 12, 6, 0); fillStroke(c, '#16161e', ol, 1.3); c.beginPath(); c.moveTo(cx - 20, 28); c.bezierCurveTo(cx - 20, 4, cx + 20, 4, cx + 20, 28); c.closePath(); fillStroke(c, '#22222e', ol, 1.3); path(c, [[cx - 20, 22], [cx + 20, 22], [cx + 21, 27], [cx - 21, 27]]); c.fillStyle = L.shirt2; c.fill(); break; }
    case 'cowboy': { ell(c, cx, 27, hw + 16, 7, 0); fillStroke(c, '#8a5a2a', ol, 1.4); path(c, [[cx - hw - 14, 25], [cx - hw - 8, 20], [cx - hw + 2, 27]]); c.fillStyle = '#6a4018'; c.fill(); path(c, [[cx + hw + 14, 25], [cx + hw + 8, 20], [cx + hw - 2, 27]]); c.fillStyle = '#6a4018'; c.fill(); c.beginPath(); c.moveTo(cx - 19, 27); c.bezierCurveTo(cx - 20, 2, cx - 4, 6, cx, 10); c.bezierCurveTo(cx + 4, 6, cx + 20, 2, cx + 19, 27); c.closePath(); fillStroke(c, hlin(c, cx - 20, cx + 20, '#a8702e', '#7a4a1c'), ol, 1.4); path(c, [[cx - 19, 22], [cx + 19, 22], [cx + 20, 27], [cx - 20, 27]]); c.fillStyle = L.shirt2; c.fill(); break; }
    case 'beret': { c.beginPath(); c.ellipse(cx - 2, 14, 27, 12, -0.12, 0, Math.PI * 2); fillStroke(c, hlin(c, cx - 28, cx + 28, shade(L.shirt, 0.15), shade(L.shirt, -0.25)), ol, 1.4); ell(c, cx - 2, 2, 2.6, 2.6, 0); fillStroke(c, shade(L.shirt, -0.3), ol, 1); break; }
    case 'turban': { // wrapped cloth: a tall rounded bundle with twisted bands and a jewel
      c.beginPath(); c.moveTo(cx - hw - 3, 40); c.bezierCurveTo(cx - hw - 8, -2, cx + hw + 8, -2, cx + hw + 3, 40); c.bezierCurveTo(cx + hw - 2, 34, cx - hw + 2, 34, cx - hw - 3, 40); c.closePath(); fillStroke(c, L.shirt, ol, 1.5);
      c.save(); c.clip(); c.strokeStyle = shade(L.shirt, -0.25); c.lineWidth = 2.2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(cx - hw - 6, 36 - i * 8); c.quadraticCurveTo(cx, 22 - i * 9, cx + hw + 6, 38 - i * 8); c.stroke(); } c.strokeStyle = shade(L.shirt, 0.35); c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(cx - hw - 6, 33 - i * 8); c.quadraticCurveTo(cx, 19 - i * 9, cx + hw + 6, 35 - i * 8); c.stroke(); } c.restore();
      ell(c, cx, 30, 3.2, 3.2, 0); fillStroke(c, '#ffd23a', ol, 1); break;
    }
    case 'topi': { // a folded white cap
      path(c, [[cx - hw + 1, 33], [cx - hw + 3, 14], [cx + hw - 3, 14], [cx + hw - 1, 33]]); fillStroke(c, '#f6f2e6', ol, 1.4); path(c, [[cx - hw + 1, 33], [cx + hw - 1, 33], [cx + hw - 1, 38], [cx - hw + 1, 38]]); fillStroke(c, '#e0d8c4', ol, 1.2);
      c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(cx, 15); c.lineTo(cx, 33); c.stroke(); break;
    }
    case 'shades-up': break;
  }
}

/* ---------- body language: arms and hands ---------- */
const LINE = '#3a2018';
/** a rounded limb segment (sleeve or skin) with a light edge on top and a shaded underside */
function limb(c: P, x0: number, y0: number, x1: number, y1: number, w: number, col: string, hi = true) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = LINE; c.lineWidth = w + 0.95; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.stroke();
  if (hi) {
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l; if (ny > 0) { nx = -nx; ny = -ny; }
    c.lineCap = 'butt'; c.lineWidth = w * 0.22; c.strokeStyle = 'rgba(255,255,255,0.2)'; c.beginPath(); c.moveTo(x0 + nx * w * 0.26, y0 + ny * w * 0.26); c.lineTo(x1 + nx * w * 0.26, y1 + ny * w * 0.26); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.16)'; c.beginPath(); c.moveTo(x0 - nx * w * 0.3, y0 - ny * w * 0.3); c.lineTo(x1 - nx * w * 0.3, y1 - ny * w * 0.3); c.stroke();
  }
  c.restore();
}
/** a tapered limb (wide at the shoulder or elbow, narrow at the wrist) with a light edge and a shaded side */
function taper(c: P, x0: number, y0: number, w0: number, x1: number, y1: number, w1: number, col: string) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, a = Math.atan2(ny, nx);
  c.beginPath(); c.moveTo(x0 + (nx * w0) / 2, y0 + (ny * w0) / 2); c.lineTo(x1 + (nx * w1) / 2, y1 + (ny * w1) / 2); c.arc(x1, y1, w1 / 2, a, a - Math.PI, true); c.lineTo(x0 - (nx * w0) / 2, y0 - (ny * w0) / 2); c.arc(x0, y0, w0 / 2, a + Math.PI, a, true); c.closePath();
  fillStroke(c, col, '#2a1230', 1.5);
  c.save(); c.clip(); let sx = nx, sy = ny; if (sy > 0) { sx = -sx; sy = -sy; }
  c.lineCap = 'butt'; c.lineWidth = w0 * 0.2; c.strokeStyle = 'rgba(255,255,255,0.2)'; c.beginPath(); c.moveTo(x0 + sx * w0 * 0.24, y0 + sy * w0 * 0.24); c.lineTo(x1 + sx * w1 * 0.24, y1 + sy * w1 * 0.24); c.stroke();
  c.lineWidth = w0 * 0.5; c.strokeStyle = 'rgba(0,0,0,0.15)'; c.beginPath(); c.moveTo(x0 - sx * w0 * 0.5, y0 - sy * w0 * 0.5); c.lineTo(x1 - sx * w1 * 0.5, y1 - sy * w1 * 0.5); c.stroke();
  c.restore();
}
const finger = (c: P, x0: number, y0: number, x1: number, y1: number, w: number, skin: string) => limb(c, x0, y0, x1, y1, w, skin, false);
/** a clenched fist seen from the front: four curled finger bars and the thumb across them (or sticking up / down) */
function fist(c: P, x: number, y: number, s: number, rot: number, skin: string, thumb: 'front' | 'up' | 'down' = 'front') {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const sh = (t: number) => shade(skin, t);
  if (thumb === 'up') finger(c, -4, -4, -5, -15, 5, skin); else if (thumb === 'down') finger(c, 5, 4, 6.5, 16, 5, skin);
  c.beginPath(); c.roundRect(-8.5, -8, 17, 16, 5); fillStroke(c, hlin(c, -8.5, 8.5, sh(0.1), sh(-0.12)), '#2a1230', 1.3);
  for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(-8.5, -8 + i * 4.1, 17, 4.3, 2.1); fillStroke(c, hlin(c, -8.5, 8.5, sh(0.08 - i * 0.015), sh(-0.1 - i * 0.015)), '#2a1230', 0.9); }
  if (thumb === 'front') { c.beginPath(); c.ellipse(-1.5, 6.2, 6.2, 3.2, -0.15, 0, 7); fillStroke(c, sh(0.06), '#2a1230', 1); }
  c.restore();
}
/** an open hand, palm to us. curled = fingers hooked toward us (a beckon): short, with nails */
function openHand(c: P, x: number, y: number, s: number, rot: number, skin: string, curled: boolean) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const fan = [-0.26, -0.09, 0.08, 0.24], len = curled ? [6.5, 8.5, 7.5, 5.8] : [11, 13, 12, 9.5], bx = [-4.9, -1.7, 1.5, 4.6];
  finger(c, -6, 3, -12.5, curled ? -0.5 : -3, 3.8, skin);
  for (let i = 0; i < 4; i++) {
    const tx = bx[i] + Math.sin(fan[i]) * len[i], ty = -5 - Math.cos(fan[i]) * len[i]; finger(c, bx[i], -4, tx, ty, 3.2, skin);
    if (curled) { c.beginPath(); c.ellipse(tx, ty - 0.2, 1.1, 1.3, 0, 0, 7); c.fillStyle = 'rgba(255,235,225,0.75)'; c.fill(); }
  }
  c.beginPath(); c.roundRect(-7, -5.5, 14, 13, 4.5); fillStroke(c, hlin(c, -7, 7, shade(skin, 0.1), shade(skin, -0.1)), '#2a1230', 1.3);
  c.strokeStyle = 'rgba(110,50,30,0.3)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-4.5, 1); c.quadraticCurveTo(0, 3.6, 4.5, 0.4); c.stroke(); c.beginPath(); c.moveTo(-3, -2); c.quadraticCurveTo(0, 0.4, 3, -1.6); c.stroke();
  c.restore();
}
/** a hand gripping the opposite upper arm (arms folded); flip = -1 for the right-hand side */
function grip(c: P, x: number, y: number, s: number, rot: number, skin: string, flip: number) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(flip * s, s);
  for (let i = 0; i < 4; i++) finger(c, -3, -4.6 + i * 3.1, -9.6 - (i === 1 ? 1.4 : i === 2 ? 0.7 : 0), -4.6 + i * 3.1 + 0.3, 3, skin);
  c.beginPath(); c.roundRect(-5.5, -7, 11, 14, 4.5); fillStroke(c, hlin(c, -5.5, 5.5, shade(skin, 0.08), shade(skin, -0.12)), '#2a1230', 1.2);
  finger(c, 2.4, 4, -2.5, 7.6, 3.4, skin);
  c.restore();
}
/** a pool cue, butt at (x0,y0), tip at (x1,y1) */
function cueStick(c: P, x0: number, y0: number, x1: number, y1: number) {
  const at = (t: number): [number, number] => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  const seg = (t0: number, t1: number, w: number, col: string) => { const a = at(t0), b = at(t1); limb(c, a[0], a[1], b[0], b[1], w, col, false); };
  seg(0, 0.4, 4.6, '#2a160c'); seg(0.4, 0.985, 3, '#f1dcaa'); seg(0.3, 0.33, 4.8, '#e8c040'); seg(0.42, 0.45, 3.2, '#2a160c'); seg(0.96, 0.985, 3.1, '#f4f4f4'); seg(0.985, 1, 3.1, '#3a8cff');
  c.save(); c.lineCap = 'butt'; c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.7; const a = at(0.46), b = at(0.96); c.beginPath(); c.moveTo(a[0] - 0.7, a[1]); c.lineTo(b[0] - 0.7, b[1]); c.stroke(); c.restore();
}
/** what the arms are doing: drawn over torso and head */
function pose(c: P, L: Look, wide: number, chin: number) {
  const p = L.pose; if (!p) return;
  const cx = 50, top = 88, sw = 44 * wide, skin = L.skin, bare = L.top === 'tank' || L.top === 'dress', short = L.top === 'tee';
  const sl = bare ? skin : shade(L.shirt, -0.06), fore = bare || short ? skin : sl, cl = (x: number) => Math.max(12, Math.min(88, x));
  const upper = (s: number) => {
    const x0 = cx + s * (sw - 7), x1 = cx + s * (sw - 4);
    if (bare) taper(c, x0, top + 8, 16, x1, 126, 13, skin); else if (short) { taper(c, x0, top + 8, 15, x1, 126, 12.5, skin); taper(c, x0, top + 8, 17, x0 + s * 0.6, top + 22, 16, sl); } else taper(c, x0, top + 8, 16, x1, 126, 14, sl);
  };
  const cuffCol = L.shirt2;
  const forearm = (x0: number, y0: number, x1: number, y1: number, col = fore, w0 = 13.5, w1 = 10.5) => {
    taper(c, x0, y0, w0, x1, y1, w1, col);
    if (col !== skin && !bare && !short) { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, px = x0 + dx * 0.86, py = y0 + dy * 0.86; const hwid = (w1 + 1.4) / 2, qx = -uy, qy = ux; c.beginPath(); c.moveTo(px - ux * 1.7 + qx * hwid, py - uy * 1.7 + qy * hwid); c.lineTo(px + ux * 1.7 + qx * hwid, py + uy * 1.7 + qy * hwid); c.lineTo(px + ux * 1.7 - qx * hwid, py + uy * 1.7 - qy * hwid); c.lineTo(px - ux * 1.7 - qx * hwid, py - uy * 1.7 - qy * hwid); c.closePath(); fillStroke(c, cuffCol, '#2a1230', 1.1); }
  };
  const arcs = (x: number, y: number, r0: number, a: number, step = 5) => { c.save(); c.lineCap = 'round'; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1; for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { c.globalAlpha = 0.7 - k * 0.3; c.beginPath(); const rr = r0 + k * step; c.arc(x, y, rr, s > 0 ? -a : Math.PI - a, s > 0 ? a : Math.PI + a); c.stroke(); } c.restore(); };
  upper(-1); upper(1);
  switch (p) {
    case 'fold': {
      forearm(cx - sw + 9, 121, cx + sw - 14, 103, shade(fore, -0.14));
      forearm(cx + sw - 9, 123, cx - sw + 14, 101);
      grip(c, cx + sw - 12.5, 101, 1, -0.12, skin, -1); grip(c, cx - sw + 12.5, 98.5, 1, 0.1, skin, 1);
      break;
    }
    case 'chin': {
      forearm(cx - sw + 9, 123, cx + 16, 109, shade(fore, -0.12));
      forearm(cx + sw - 14, 128, cx + 14, chin + 12);
      finger(c, cx + 12.5, chin + 0.5, cx + 19, chin - 13, 3.1, skin);
      fist(c, cx + 7, chin + 5.5, 0.82, -0.25, skin);
      break;
    }
    case 'beckon': {
      const hx = cl(cx + sw - 11); forearm(hx + 4, 128, hx + 1, 105); openHand(c, hx, 96, 1, 0.12, skin, true);
      c.save(); c.lineCap = 'round'; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1; for (let k = 0; k < 2; k++) { c.globalAlpha = 0.7 - k * 0.3; c.beginPath(); c.arc(hx + 2, 92, 15 + k * 5, Math.PI * 1.1, Math.PI * 1.42); c.stroke(); } c.restore();
      break;
    }
    case 'wag': {
      const hx = cl(cx + sw - 12); forearm(hx + 3, 128, hx, 106);
      finger(c, hx - 3.5, 98, hx - 5, 78, 3.6, skin); fist(c, hx, 101, 0.95, 0.05, skin);
      arcs(hx - 5, 80, 8, 0.8);
      break;
    }
    case 'shrug': {
      for (const s of [-1, 1]) { const hx = cl(cx + s * (sw - 4)); forearm(cx + s * (sw - 10), 128, hx + s * 0.5, 108); openHand(c, hx + s, 99, 0.95, s * 0.38, skin, false); }
      break;
    }
    case 'fist': {
      const hx = cl(cx + sw - 10); forearm(hx + 4, 128, hx + 1, 102); fist(c, hx, 95, 1.05, 0.06, skin);
      break;
    }
    case 'cue': {
      const bx = Math.min(cx + sw + 1, 94), hx = bx - 4;
      cueStick(c, bx, 132, bx - 17, -6); forearm(hx + 5, 128, hx + 2, 106); fist(c, hx + 0.5, 100, 1, -0.12, skin);
      break;
    }
    case 'thumbdown': {
      const hx = cl(cx + sw - 12); forearm(hx + 4, 128, hx + 1, 104); fist(c, hx, 97, 0.98, 0.08, skin, 'down');
      break;
    }
  }
}
