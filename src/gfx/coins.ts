/* Carrom coins and strikers, painted as thick vector discs (side wall, glossy face, engraved rings) and cached as sprites per size.
   `lookOf` maps a coin id of a game to its look; `drawCoin` stamps a (rotated) sprite, `drawShadow` the soft shadow under it. */
import type { GameId } from '../data/modes.js';
import type { StrikerDef } from '../data/items.js';
import { QUEEN, rackCoins } from '../game/rules.js';
import { HB, CR, PK_IN } from '../game/physics.js';
import { view } from '../config.js';
import { hi } from './hires.js';
import { shade } from '../util.js';

export interface CoinLook { kind: 'white' | 'black' | 'queen' | 'num' | 'striker'; num: number; face: [string, string]; rim: string; ring: string }
const NUM_COLS = ['#ffd23a', '#3a8cff', '#ff4a5a', '#a060e8', '#ff8a2a', '#3ac870', '#c8402a', '#5a5a66'];
export function lookOf(game: GameId, id: number): CoinLook {
  if (id === 0) return { kind: 'striker', num: 0, face: ['#f6efe0', '#d8ccb0'], rim: '#a89870', ring: '#b8a888' };
  if (game === 'target') { const c = NUM_COLS[(id - 1) % 8]; return { kind: 'num', num: id, face: [shade(c, 0.35), c], rim: shade(c, -0.55), ring: shade(c, -0.25) }; }
  if (id === QUEEN) return { kind: 'queen', num: 0, face: ['#ff6a72', '#b01424'], rim: '#5a0612', ring: '#ffb8bc' };
  if (id <= 9) return { kind: 'white', num: 0, face: ['#fffaea', '#dccb9a'], rim: '#9c885a', ring: '#b8a574' };
  return { kind: 'black', num: 0, face: ['#554a42', '#17120f'], rim: '#050403', ring: '#8a7c6e' };
}

const cache = new Map<string, HTMLCanvasElement>();
const PAD = 2.2;
type C = CanvasRenderingContext2D;
function disc(c: C, cx: number, cy: number, r: number, face: [string, string], rim: string, thick: number) {
  // side wall (drawn lower), then the top face
  c.beginPath(); c.arc(cx, cy + thick, r, 0, 7); c.fillStyle = rim; c.fill();
  c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fillStyle = shade(rim, 0.1); c.fill();
  const g = c.createRadialGradient(cx - r * 0.34, cy - r * 0.4, r * 0.08, cx, cy, r * 1.02); g.addColorStop(0, face[0]); g.addColorStop(0.55, mix(face[0], face[1], 0.55)); g.addColorStop(1, face[1]);
  c.beginPath(); c.arc(cx, cy, r - r * 0.04, 0, 7); c.fillStyle = g; c.fill();
  c.lineWidth = Math.max(0.5, r * 0.07); c.strokeStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.arc(cx, cy, r - r * 0.04, 0, 7); c.stroke();
}
const mix = (a: string, b: string, t: number) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t); return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join(''); };
function gloss(c: C, cx: number, cy: number, r: number, k = 1) {
  c.save(); c.beginPath(); c.arc(cx, cy, r * 0.94, 0, 7); c.clip();
  const g = c.createLinearGradient(cx - r, cy - r, cx + r * 0.3, cy + r * 0.4); g.addColorStop(0, `rgba(255,255,255,${0.5 * k})`); g.addColorStop(0.5, `rgba(255,255,255,${0.08 * k})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.beginPath(); c.ellipse(cx - r * 0.2, cy - r * 0.38, r * 0.78, r * 0.42, -0.5, 0, 7); c.fill(); c.restore();
}
function paintCoin(c: C, L: CoinLook, r: number) {
  const cx = r + PAD, cy = r + PAD - r * 0.06, th = r * 0.13;
  disc(c, cx, cy, r, L.face, L.rim, th);
  c.lineWidth = Math.max(0.4, r * 0.06); c.strokeStyle = L.ring; c.globalAlpha = 0.75;
  c.beginPath(); c.arc(cx, cy, r * 0.74, 0, 7); c.stroke(); c.beginPath(); c.arc(cx, cy, r * 0.42, 0, 7); c.stroke(); c.globalAlpha = 1;
  if (L.kind === 'black') { c.beginPath(); c.arc(cx, cy, r * 0.74, 0.5, 2.4); c.strokeStyle = 'rgba(255,255,255,0.14)'; c.stroke(); }
  if (L.kind === 'queen') { for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; c.beginPath(); c.ellipse(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.2, r * 0.08, a, 0, 7); c.fillStyle = 'rgba(255,230,230,0.5)'; c.fill(); } }
  if (L.kind === 'num') { c.fillStyle = L.rim; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold ${r * 1.15}px Arial, Helvetica, sans-serif`; c.fillText(String(L.num), cx, cy + r * 0.06); }
  gloss(c, cx, cy, r);
}
function paintStriker(c: C, d: StrikerDef, r: number) {
  const cx = r + PAD, cy = r + PAD - r * 0.05, th = r * 0.11;
  disc(c, cx, cy, r, d.face, d.rim, th);
  c.save(); c.strokeStyle = d.mark; c.fillStyle = d.mark; c.lineWidth = Math.max(0.45, r * 0.05); c.globalAlpha = 0.85;
  const ring = (k: number) => { c.beginPath(); c.arc(cx, cy, r * k, 0, 7); c.stroke(); };
  switch (d.style) {
    case 'plain': ring(0.78); c.beginPath(); c.arc(cx, cy, r * 0.12, 0, 7); c.fill(); break;
    case 'ring': ring(0.84); ring(0.58); ring(0.3); c.beginPath(); c.arc(cx, cy, r * 0.1, 0, 7); c.fill(); break;
    case 'flower': ring(0.8); for (let i = 0; i < 6; i++) { c.save(); c.translate(cx, cy); c.rotate((i * Math.PI) / 3); c.beginPath(); c.ellipse(r * 0.38, 0, r * 0.3, r * 0.13, 0, 0, 7); c.globalAlpha = 0.7; c.fill(); c.restore(); } c.beginPath(); c.arc(cx, cy, r * 0.1, 0, 7); c.fillStyle = d.rim; c.fill(); break;
    case 'star': ring(0.82); c.beginPath(); for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8 - Math.PI / 2, rr = i % 2 ? r * 0.28 : r * 0.7; c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } c.closePath(); c.globalAlpha = 0.75; c.fill(); break;
    case 'gold': ring(0.86); ring(0.7); for (let i = 0; i < 8; i++) { c.save(); c.translate(cx, cy); c.rotate((i * Math.PI) / 4); c.beginPath(); c.moveTo(r * 0.2, 0); c.quadraticCurveTo(r * 0.45, -r * 0.16, r * 0.66, 0); c.quadraticCurveTo(r * 0.45, r * 0.16, r * 0.2, 0); c.globalAlpha = 0.8; c.fill(); c.restore(); } break;
    case 'cosmic': { const ng = c.createRadialGradient(cx, cy, 0, cx, cy, r); ng.addColorStop(0, 'rgba(180,120,255,0.8)'); ng.addColorStop(1, 'rgba(60,20,160,0)'); c.fillStyle = ng; c.beginPath(); c.arc(cx, cy, r * 0.95, 0, 7); c.fill(); c.fillStyle = d.mark; for (let i = 0; i < 26; i++) { const a = (i * 2.4), rr = r * 0.9 * Math.sqrt(((i * 37) % 100) / 100); c.globalAlpha = 0.4 + ((i * 13) % 6) / 10; c.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.7, 0.7); } ring(0.84); break; }
  }
  c.restore(); gloss(c, cx, cy, r, 1.1);
}
/** the sprite of a coin or striker of radius r (logical px); the picture is centred, PAD px of margin around it */
export function coinSprite(L: CoinLook, r: number, striker?: StrikerDef): HTMLCanvasElement {
  const key = `${L.kind}|${L.num}|${striker?.id ?? ''}|${r.toFixed(1)}|${view.rs}|${L.face[0]}`; let s = cache.get(key); if (s) return s;
  const size = 2 * r + 2 * PAD, { cv, ctx } = hi(size, size);
  if (L.kind === 'striker' && striker) paintStriker(ctx, striker, r); else paintCoin(ctx, L, r);
  if (cache.size > 300) cache.clear(); cache.set(key, cv); return cv;
}
/** stamp a coin centred at x, y (rotated by rot, scaled by k for the pocket-drop animation) */
export function drawCoin(ctx: C, L: CoinLook, x: number, y: number, r: number, o: { striker?: StrikerDef; rot?: number; alpha?: number; k?: number } = {}) {
  const sp = coinSprite(L, r, o.striker), n = r + PAD; const k = o.k ?? 1;
  ctx.save(); if (o.alpha !== undefined) ctx.globalAlpha = o.alpha; ctx.translate(x, y); if (k !== 1) ctx.scale(k, k);
  if (o.rot && L.kind !== 'white' && L.kind !== 'black') ctx.rotate(o.rot);
  ctx.drawImage(sp, -n, -n + r * 0.06); ctx.restore();
}
export function drawShadow(ctx: C, x: number, y: number, r: number, a = 0.32) { ctx.fillStyle = `rgba(20,8,0,${a})`; ctx.beginPath(); ctx.ellipse(x + r * 0.22, y + r * 0.34, r * 1.02, r * 0.96, 0, 0, 7); ctx.fill(); }
/** a small coin icon for the HUD */
export function drawCoinIcon(ctx: C, game: GameId, id: number, x: number, y: number, r: number, striker?: StrikerDef) { drawCoin(ctx, lookOf(game, id), x, y, r, { striker }); }

/** a round badge for a game mode (menus): a representative coin */
export function modeBadge(ctx: C, mode: GameId, x: number, y: number, r: number) {
  const pick: Record<GameId, [GameId, number]> = { classic: ['classic', 1], free: ['classic', 10], duel: ['classic', 19], rapid: ['target', 1], knock: ['target', 3], queen: ['classic', 19], target: ['target', 2], bank: ['target', 5], sprint: ['target', 4], combo: ['target', 6] };
  const [g, id] = pick[mode]; drawShadow(ctx, x, y, r, 0.3); drawCoin(ctx, lookOf(g, id), x, y, r);
}
/** a miniature board with the start position of a game, centred at cx, cy and `size` px across */
export function miniRack(ctx: C, mode: GameId, cx: number, cy: number, size: number, frame: [string, string] = ['#b8803c', '#6a3e14'], surface: [string, string] = ['#ecca8e', '#cfa466']) {
  const k = size / (2 * HB), x0 = cx - size / 2, y0 = cy - size / 2, f = size * 0.07;
  const fg = ctx.createLinearGradient(x0 - f, y0 - f, x0 + size + f, y0 + size + f); fg.addColorStop(0, frame[0]); fg.addColorStop(1, frame[1]);
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(x0 - f + 1.5, y0 - f + 2.5, size + 2 * f, size + 2 * f, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x0 - f, y0 - f, size + 2 * f, size + 2 * f, 3); ctx.fillStyle = fg; ctx.fill(); ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
  const sg = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 0.75); sg.addColorStop(0, surface[0]); sg.addColorStop(1, surface[1]); ctx.fillStyle = sg; ctx.fillRect(x0, y0, size, size);
  ctx.fillStyle = '#1a0e06'; for (const sx of [-1, 1]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + sx * (HB - PK_IN) * k, cy + sy * (HB - PK_IN) * k, 0.041 * k, 0, 7); ctx.fill(); }
  ctx.strokeStyle = 'rgba(60,30,10,0.7)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(cx, cy, 0.0715 * k, 0, 7); ctx.stroke();
  for (const c of rackCoins(mode)) { if (c.id === 0) continue; drawCoin(ctx, lookOf(mode, c.id), cx + c.x * k, cy - c.y * k, CR * k * 1.04); }
  ctx.restore();
}
