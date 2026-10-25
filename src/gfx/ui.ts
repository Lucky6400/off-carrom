/* UI kit: deep felt-green panels with neon mint borders, glossy capsules, round corner buttons, vector icons. Same API as Off Bowling's kit, re-skinned green
   and laid out for a landscape screen (240 high, view.w wide). Everything is vector (hi-res) except the icon glyphs, painted once and cached. */
import { text, textWidth, textHeight, type TextOpts } from './font.js';
import { clickedIn, holdingIn } from '../input.js';
import { view } from '../config.js';
import { sfx } from '../audio.js';
import { hash2, shade, mixHex } from '../util.js';
import { hi } from './hires.js';
import {
  mdiCheckBold, mdiKeyboardReturn, mdiMenuLeft, mdiMenuRight, mdiMenuUp, mdiMenuDown, mdiCart, mdiStar, mdiCog, mdiPower, mdiLock, mdiPause, mdiPlay, mdiFastForward, mdiClose, mdiTrophy,
  mdiHome, mdiInformation, mdiPlus, mdiVolumeHigh, mdiVolumeOff, mdiFlash, mdiCrosshairs, mdiHandBackRight, mdiAccount, mdiRestart, mdiSkipForward, mdiHelpCircle, mdiSchool, mdiMap, mdiHeart,
  mdiChevronLeft, mdiChevronRight, mdiTimerOutline, mdiAccountGroup,
} from '@mdi/js';

export const COL = {
  bg: '#120c06', ink: '#1f1309', deep: '#35220f', green: '#af6f2f', mint: '#e1a569', lime: '#edc65c', teal: '#c7893b', cyan: '#f0c079', pink: '#ff7ae8',
  gold: '#ffd23a', goldHi: '#fff4a0', goldLo: '#c88a0a', white: '#ffffff', grey: '#c0af9e', red: '#ff3a4a', orange: '#ff9a2a', silver: '#d8e0f0', bronze: '#d8883a',
  line: '#e1a569', fill: '#442b12', ol: '#261809',
};
type Ctx = CanvasRenderingContext2D;

/* ---------------------------------------------------------------- vector shapes */
const rr = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); };
export function fillRR(ctx: Ctx, x: number, y: number, w: number, h: number, col: string | CanvasGradient, cut = 1) { rr(ctx, x, y, w, h, cut * 1.7); ctx.fillStyle = col; ctx.fill(); }
/** rounded rect with an explicit radius (borders: outer radius = inner radius + border width, so the corners stay concentric) */
export function fillRRr(ctx: Ctx, x: number, y: number, w: number, h: number, col: string | CanvasGradient, r: number) { rr(ctx, x, y, w, h, r); ctx.fillStyle = col; ctx.fill(); }
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, border: string | null, cut = 2, b = 1) { if (border) fillRR(ctx, x, y, w, h, border, cut); fillRR(ctx, x + (border ? b : 0), y + (border ? b : 0), w - (border ? 2 * b : 0), h - (border ? 2 * b : 0), fill, Math.max(1, cut - (border ? 0.5 : 0))); }
export function vgrad(ctx: Ctx, x: number, y: number, w: number, h: number, c0: string, c1: string) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
export const mixCss = (a: string, b: string, t: number) => mixHex(a, b, t);
export const alpha = (c: string, a: number) => { const v = parseInt(c.slice(1), 16); return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`; };

/** glassy dark-green panel (info boxes, rows) */
export function panel(ctx: Ctx, x: number, y: number, w: number, h: number, o: { fill?: string; line?: string; alpha?: number; glow?: number } = {}) {
  const line = o.line ?? COL.line, fill = o.fill ?? COL.fill; ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
  ctx.shadowColor = alpha(line, 0.5); ctx.shadowBlur = (o.glow ?? 5) ; fillRR(ctx, x, y, w, h, line, 2.4); ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, shade(fill, 0.22)); g.addColorStop(0.5, fill); g.addColorStop(1, shade(fill, -0.3)); fillRR(ctx, x + 1, y + 1, w - 2, h - 2, g, 1.9);
  const hg = ctx.createLinearGradient(0, y, 0, y + h * 0.5); hg.addColorStop(0, 'rgba(255,255,255,0.16)'); hg.addColorStop(1, 'rgba(255,255,255,0)'); rr(ctx, x + 1.5, y + 1.5, w - 3, h / 2, 3); ctx.fillStyle = hg; ctx.fill();
  ctx.restore();
}

/* ---------------------------------------------------------------- hit testing helpers */
export interface Hit { click: boolean; down: boolean }
export function hit(x: number, y: number, w: number, h: number, silent = false): Hit { const click = clickedIn(x, y, w, h); if (click && !silent) sfx('click'); return { click, down: holdingIn(x, y, w, h) }; }

/* ---------------------------------------------------------------- capsule buttons */
export type CapStyle = 'green' | 'teal' | 'dark' | 'gold' | 'red' | 'grey' | 'lime' | 'blue' | 'purple';
const CAP: Record<string, [string, string, string]> = {
  green: ['#de9a5a', '#6f4115', '#fae2cd'], teal: ['#c78a3b', '#604014', '#fae6cd'], dark: ['#8e5e2b', '#35200b', '#e6be94'], gold: ['#ffdc4a', '#b86a0a', '#fff8c0'],
  red: ['#ff5a6a', '#8a0a1a', '#ffc0c8'], grey: ['#7a9488', '#362f28', '#d6ccc2'], lime: ['#edca5c', '#8c6a18', '#f9edc6'],
};
CAP.blue = CAP.teal; CAP.purple = CAP.dark;
const lightenCss = (c: string, t: number) => mixHex(c, '#ffffff', t), darkenCss = (c: string) => mixHex(c, '#000000', 0.25);
function capsuleShape(ctx: Ctx, x: number, y: number, w: number, h: number, S: [string, string, string], pressed: boolean) {
  const yy = y + (pressed ? 1 : 0); ctx.save();
  if (!pressed) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, x, yy + 1.5, w, h, h / 2); ctx.fill(); }
  ctx.shadowColor = alpha(S[2], 0.5); ctx.shadowBlur = pressed ? 2 : 5; rr(ctx, x - 0.8, yy - 0.8, w + 1.6, h + 1.6, h / 2 + 0.8); ctx.fillStyle = S[2]; ctx.fill(); ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, yy, 0, yy + h); g.addColorStop(0, lightenCss(S[0], 0.25)); g.addColorStop(0.5, S[0]); g.addColorStop(1, S[1]); rr(ctx, x, yy, w, h, h / 2); ctx.fillStyle = pressed ? darkenCss(S[0]) : g; ctx.fill();
  const hg = ctx.createLinearGradient(0, yy, 0, yy + h * 0.55); hg.addColorStop(0, 'rgba(255,255,255,0.6)'); hg.addColorStop(1, 'rgba(255,255,255,0.02)'); rr(ctx, x + 1.2, yy + 0.8, w - 2.4, h * 0.5, h / 2.4); ctx.fillStyle = hg; ctx.fill(); ctx.restore();
}
/** glossy capsule button with centred label; returns true when clicked */
export function capsule(ctx: Ctx, label: string, cx: number, y: number, w: number, h = 17, style: CapStyle = 'green', o: { disabled?: boolean; scale?: number } = {}): boolean {
  const x = cx - w / 2, hh = hit(x, y, w, h, !!o.disabled), pr = hh.down && !o.disabled, S = CAP[o.disabled ? 'grey' : style], sc = o.scale ?? 1;
  capsuleShape(ctx, x, y, w, h, S, pr);
  text(ctx, label, cx, y + (h - 7 * sc) / 2 + (pr ? 1 : 0), { scale: sc, bold: true, color: '#ffffff', outline: mixHex(S[1], '#000000', 0.45), align: 'c' });
  return hh.click && !o.disabled;
}

/* ---------------------------------------------------------------- round buttons with icons */
export type RoundStyle = 'green' | 'teal' | 'dark' | 'gold' | 'red' | 'grey' | 'lime' | 'blue' | 'purple';
const RND: Record<string, [string, string, string]> = {
  green: ['#de9a5a', '#6f4115', '#fae2cd'], teal: ['#c78a3b', '#523712', '#fae6cd'], dark: ['#8e5e2b', '#2c1a08', '#e6be94'], gold: ['#ffdc4a', '#b86a0a', '#fff8c0'],
  red: ['#ff5a6a', '#8a0a1a', '#ffc8d0'], grey: ['#7a9488', '#362f28', '#d6ccc2'], lime: ['#edca5c', '#8c6a18', '#f9edc6'],
};
RND.blue = RND.teal; RND.purple = RND.dark;
export function roundBtn(ctx: Ctx, icon: IconName, cx: number, cy: number, r = 13, style: RoundStyle = 'green', o: { disabled?: boolean; silent?: boolean } = {}): boolean {
  const hh = hit(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4, !!o.disabled || !!o.silent), pr = hh.down && !o.disabled, S = RND[o.disabled ? 'grey' : style], y = cy + (pr ? 1 : 0);
  ctx.save(); if (!pr) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(cx, y + 1.8, r, 0, 7); ctx.fill(); }
  ctx.shadowColor = alpha(S[2], 0.6); ctx.shadowBlur = 6; ctx.fillStyle = S[2]; ctx.beginPath(); ctx.arc(cx, y, r + 0.9, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  const g = ctx.createRadialGradient(cx - r * 0.3, y - r * 0.4, r * 0.1, cx, y, r); g.addColorStop(0, lightenCss(S[0], 0.4)); g.addColorStop(0.45, S[0]); g.addColorStop(1, S[1]); ctx.fillStyle = pr ? darkenCss(S[0]) : g; ctx.beginPath(); ctx.arc(cx, y, r, 0, 7); ctx.fill();
  const hg = ctx.createLinearGradient(0, y - r, 0, y); hg.addColorStop(0, 'rgba(255,255,255,0.55)'); hg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(cx, y - r * 0.45, r * 0.72, r * 0.46, 0, 0, 7); ctx.fill(); ctx.restore();
  const ic = iconCanvas(icon, r); ctx.drawImage(ic, cx - ic.width / 2, y - ic.height / 2);
  return hh.click && !o.disabled;
}

/* ---------------------------------------------------------------- icons */
export type IconName = 'tick' | 'back' | 'left' | 'right' | 'up' | 'down' | 'cart' | 'star' | 'starOn' | 'starOff' | 'coin' | 'gear' | 'power' | 'lock' | 'pause' | 'play' | 'ff' | 'cross' | 'ball' | 'cup' | 'home' | 'info' | 'plus' | 'sound' | 'mute' | 'trophy' | 'bolt' | 'target' | 'hand' | 'user' | 'restart' | 'skip' | 'help' | 'school' | 'map' | 'heart' | 'chevL' | 'chevR' | 'timer' | 'group';
const SIZE: Record<string, number> = { tick: 14, back: 14, left: 11, right: 11, up: 11, down: 11, cart: 14, star: 12, starOn: 16, starOff: 16, coin: 12, gear: 14, power: 13, lock: 12, pause: 12, play: 11, ff: 14, cross: 12, ball: 12, cup: 14, home: 13, info: 11, plus: 11, sound: 13, mute: 13, trophy: 14, bolt: 14, target: 15, hand: 14, user: 13, restart: 13, skip: 13, help: 13, school: 14, map: 14, heart: 11, chevL: 12, chevR: 12, timer: 12, group: 14 };
const OUT = '#2c1b09';
const PATHS: Record<string, string> = { tick: mdiCheckBold, back: mdiKeyboardReturn, left: mdiMenuLeft, right: mdiMenuRight, up: mdiMenuUp, down: mdiMenuDown, cart: mdiCart, star: mdiStar, starOn: mdiStar, starOff: mdiStar, gear: mdiCog, power: mdiPower, lock: mdiLock, pause: mdiPause, play: mdiPlay, ff: mdiFastForward, cross: mdiClose, cup: mdiTrophy, trophy: mdiTrophy, home: mdiHome, info: mdiInformation, plus: mdiPlus, sound: mdiVolumeHigh, mute: mdiVolumeOff, bolt: mdiFlash, target: mdiCrosshairs, hand: mdiHandBackRight, user: mdiAccount, restart: mdiRestart, skip: mdiSkipForward, help: mdiHelpCircle, school: mdiSchool, map: mdiMap, heart: mdiHeart, chevL: mdiChevronLeft, chevR: mdiChevronRight, timer: mdiTimerOutline, group: mdiAccountGroup };
const TINT: Record<string, [string, string]> = { star: ['#fff4a0', '#f0a010'], starOn: ['#fbecdc', '#d7944b'], starOff: ['#543b22', '#352311'], lock: ['#fff4a0', '#e0a010'], cup: ['#fff4a0', '#e0a010'], trophy: ['#fff4a0', '#e0a010'], bolt: ['#fff8b0', '#ffb810'], heart: ['#ff9aa8', '#e0203a'], coin: ['#fff4a0', '#e0a010'] };
function paintCoin(c: Ctx) {
  const g = c.createRadialGradient(7, 6, 1, 10, 10, 10); g.addColorStop(0, '#fff8c0'); g.addColorStop(0.45, '#ffd23a'); g.addColorStop(1, '#c87a08');
  c.beginPath(); c.arc(10, 10, 9.3, 0, 7); c.fillStyle = '#4a2400'; c.fill(); c.beginPath(); c.arc(10, 10, 8.7, 0, 7); c.fillStyle = g; c.fill();
  c.strokeStyle = 'rgba(120,60,0,0.55)'; c.lineWidth = 0.7; for (let i = 0; i < 28; i++) { const a = (i / 28) * 6.2832; c.beginPath(); c.moveTo(10 + Math.cos(a) * 7.7, 10 + Math.sin(a) * 7.7); c.lineTo(10 + Math.cos(a) * 8.7, 10 + Math.sin(a) * 8.7); c.stroke(); }
  c.beginPath(); c.arc(10, 10, 6.6, 0, 7); c.lineWidth = 1; c.strokeStyle = '#a85a00'; c.stroke(); c.beginPath(); c.arc(10, 10, 6.1, 0, 7); c.fillStyle = lg2(c); c.fill();
  c.save(); c.translate(10, 10.3); c.scale(0.36, 0.36); c.translate(-12, -12); const sp = new Path2D(mdiStar); c.translate(0.6, 0.8); c.fillStyle = 'rgba(140,70,0,0.55)'; c.fill(sp); c.translate(-0.6, -0.8); c.fillStyle = '#fff2a0'; c.fill(sp); c.restore();
  c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(6.6, 5.6, 2.6, 1.1, -0.7, 0, 7); c.fill();
}
const lg2 = (c: Ctx) => { const g = c.createLinearGradient(0, 4, 0, 16); g.addColorStop(0, '#ffe068'); g.addColorStop(1, '#f0a818'); return g; };
function paintBall8(c: Ctx) {
  c.beginPath(); c.arc(10, 10, 8.6, 0, 7); const g = c.createRadialGradient(7, 6.5, 1, 10, 10, 9.5); g.addColorStop(0, '#8a8a8a'); g.addColorStop(0.35, '#2a2a2a'); g.addColorStop(1, '#000'); c.fillStyle = g; c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#180e04'; c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(10, 9.4, 3.6, 0, 7); c.fill(); c.fillStyle = '#111'; c.font = 'bold 6.2px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('8', 10, 9.8);
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(6.6, 5.4, 2.4, 1.2, -0.6, 0, 7); c.fill();
}
function paintIcon(c: Ctx, n: string) {
  if (n === 'coin') { paintCoin(c); return; }
  if (n === 'ball') { paintBall8(c); return; }
  const d = PATHS[n]; if (!d) return; const p = new Path2D(d), t = TINT[n];
  c.save(); c.scale(20 / 24, 20 / 24); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 2.8; c.stroke(p);
  if (t) { const g = c.createLinearGradient(0, 2, 0, 22); g.addColorStop(0, t[0]); g.addColorStop(1, t[1]); c.fillStyle = g; } else c.fillStyle = '#ffffff'; c.fill(p); c.restore();
}
const iconCache = new Map<string, HTMLCanvasElement>();
/** crisp vector icon canvas (logical size per icon; the glyph is designed on a 20 x 20 grid); `r` lets round buttons scale the glyph a little */
export function iconCanvas(name: IconName, r = 13): HTMLCanvasElement {
  const k = r >= 17 ? 1.25 : r <= 9 ? 0.8 : 1, key = name + view.rs + k; let c = iconCache.get(key); if (c) return c;
  const sz = (SIZE[name] ?? 12) * k, pad = 1.5, { cv, ctx } = hi(sz + pad * 2, sz + pad * 2); ctx.translate(pad, pad); ctx.scale(sz / 20, sz / 20); paintIcon(ctx, name);
  iconCache.set(key, cv); return cv;
}
export function icon(ctx: Ctx, name: IconName, x: number, y: number, o: { center?: boolean } = {}) { const c = iconCanvas(name); ctx.drawImage(c, o.center ? x - c.width / 2 : x, o.center ? y - c.height / 2 : y); }

/* ---------------------------------------------------------------- stars / badges */
const medalCache = new Map<string, HTMLCanvasElement>();
export function medalCanvas(m: number): HTMLCanvasElement {
  const key = m + ':' + view.rs; let c = medalCache.get(key); if (c) return c;
  const cols = m === 3 ? ['#ffd23a', '#fff4a0', '#b8780a'] : m === 2 ? ['#dce4f4', '#ffffff', '#8a94b0'] : ['#e0903a', '#ffc888', '#8a4a1a'];
  const { cv, ctx } = hi(12, 16);
  ctx.fillStyle = '#e83a5a'; ctx.beginPath(); ctx.moveTo(1.5, 0); ctx.lineTo(5, 0); ctx.lineTo(7, 7); ctx.lineTo(3.6, 8); ctx.fill(); ctx.fillStyle = '#a01a3a'; ctx.beginPath(); ctx.moveTo(10.5, 0); ctx.lineTo(7, 0); ctx.lineTo(5, 7); ctx.lineTo(8.4, 8); ctx.fill();
  const g = ctx.createRadialGradient(5, 9.4, 0.5, 6, 10.5, 5); g.addColorStop(0, cols[1]); g.addColorStop(0.5, cols[0]); g.addColorStop(1, cols[2]); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(6, 10.5, 4.6, 0, 7); ctx.fill(); ctx.lineWidth = 0.6; ctx.strokeStyle = '#2a1030'; ctx.stroke();
  ctx.strokeStyle = cols[2]; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(6, 10.5, 3, 0, 7); ctx.stroke();
  medalCache.set(key, cv); return cv;
}

/* ---------------------------------------------------------------- backgrounds */
const bgCache = new Map<string, HTMLCanvasElement>();
export type BgKind = 'green' | 'teal' | 'dark' | 'lime' | 'red' | 'gold';
const PAL: Record<BgKind, [string, string, string]> = { green: ['#925c22', '#1a1006', '#dfa05b'], teal: ['#92611e', '#1b1307', '#dfa65b'], dark: ['#523414', '#0d0803', '#c88a4a'], lime: ['#d7b24b', '#35200f', '#f2da8d'], red: ['#b82040', '#2a0614', '#ff5a7a'], gold: ['#e8b02a', '#3a2204', '#ffe27a'] };
/** menu backdrop: gradient, light rays, grid, stars, vignette; cached per width */
export function menuBg(ctx: Ctx, kind: BgKind = 'green') {
  const w = view.w, h = view.h, k = kind + w + view.rs; let c = bgCache.get(k);
  if (!c) {
    const { cv, ctx: g } = hi(w, h), pal = PAL[kind];
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i <= 12; i += 2) { const a = 0.12 + (i * (Math.PI - 0.24)) / 12, w2 = 0.09; const rg = g.createLinearGradient(w / 2, -10, w / 2 + Math.cos(a) * h * 1.4, -10 + Math.sin(a) * h * 1.4); rg.addColorStop(0, 'rgba(255,255,255,0.15)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.beginPath(); g.moveTo(w / 2, -10); g.lineTo(w / 2 + Math.cos(a - w2) * 900, -10 + Math.sin(a - w2) * 900); g.lineTo(w / 2 + Math.cos(a + w2) * 900, -10 + Math.sin(a + w2) * 900); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 0.5; for (let x = 0; x <= w; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const gl = g.createRadialGradient(w / 2, 0, 5, w / 2, 0, h * 0.9); gl.addColorStop(0, alpha(pal[2], 0.35)); gl.addColorStop(1, alpha(pal[2], 0)); g.fillStyle = gl; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; for (let i = 0; i < 60; i++) { g.globalAlpha = 0.2 + hash2(i, 9) * 0.6; g.beginPath(); g.arc(hash2(i, 3) * w, hash2(i, 5) * h * 0.8, 0.35 + hash2(i, 7) * 0.5, 0, 7); g.fill(); } g.globalAlpha = 1;
    const vg = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(11,6,1,0.5)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    c = cv; bgCache.set(k, c);
  }
  ctx.drawImage(c, 0, 0);
}

/** header pill ("SHOP", "LOCATION"): rounded green plate with a mint outline */
export function header(ctx: Ctx, label: string, cx: number, y: number, w = 130, o: { sub?: string } = {}) {
  const x = cx - w / 2; ctx.save(); ctx.shadowColor = 'rgba(225,165,105,0.7)'; ctx.shadowBlur = 8; fillRRr(ctx, x - 1.2, y - 1.2, w + 2.4, 25.4, '#f3c496', 8.7); ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, y, 0, y + 22); g.addColorStop(0, '#d7914b'); g.addColorStop(0.5, '#925a20'); g.addColorStop(1, '#52310f'); fillRR(ctx, x, y, w, 23, g, 4.4);
  const hg = ctx.createLinearGradient(0, y, 0, y + 12); hg.addColorStop(0, 'rgba(255,255,255,0.5)'); hg.addColorStop(1, 'rgba(255,255,255,0)'); fillRR(ctx, x + 1.5, y + 1, w - 3, 11, hg, 3.5); ctx.restore();
  text(ctx, label, cx, y + 8, { scale: 1, bold: true, color: '#ffffff', outline: '#2c1a08', align: 'c' });
  if (o.sub) text(ctx, o.sub, cx, y + 28, { color: '#f2dac3', outline: '#2c1a08', align: 'c' });
}
/** text with the default look: white, dark green outline */
export const T = (ctx: Ctx, s: string, x: number, y: number, o: TextOpts & { align?: 'l' | 'c' | 'r' } = {}) => text(ctx, s, x, y, { color: '#ffffff', outline: COL.ol, ...o });
export { textWidth, textHeight };
/** the text scale (<= base) that makes `s` fit in maxW */
export const fit = (s: string, maxW: number, o: TextOpts = {}, base = 1) => Math.min(base, (maxW / Math.max(1, textWidth(s, { ...o, scale: base }))) * base);

/** a big name with a subtitle underneath, with a proper gap; returns the y of the bottom */
export function titleBlock(ctx: Ctx, name: string, sub: string | null, cx: number, y: number, o: { scale?: number; color2?: string; align?: 'l' | 'c' | 'r' } = {}): number {
  const sc = o.scale ?? 2, capH = textHeight({ scale: sc, bold: true }), al = o.align ?? 'c';
  text(ctx, name, cx, y, { scale: sc, bold: true, slant: 0.15, color: '#ffffff', color2: o.color2 ?? '#fae3cd', outline: '#2c1a08', shadow: '#000000', align: al });
  if (!sub) return y + capH + 4; const sy = y + capH + 7 + sc * 2;
  text(ctx, sub, cx, sy, { color: '#f2dac3', outline: '#2c1a08', align: al }); return sy + 10;
}

/** small stat bar (label + 10 segments), used by shop and character screens */
export function statBar(ctx: Ctx, x: number, y: number, w: number, label: string, v: number, col: string, max = 10, labelW = 54) {
  text(ctx, label, x, y, { color: '#ffffff', outline: COL.ol });
  const bx = x + labelW + 3, bw = w - labelW - 3; fillRRr(ctx, bx - 1, y - 1, bw + 2, 9, '#e1a569', 2.7); fillRR(ctx, bx, y, bw, 7, '#1d1207', 1);
  const seg = bw / max; for (let i = 0; i < max; i++) { const on = i < Math.round(v); ctx.fillStyle = on ? col : '#362412'; ctx.fillRect(Math.round(bx + i * seg + 1), y + 1, Math.max(1, Math.floor(seg) - 1), 5); if (on) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(Math.round(bx + i * seg + 1), y + 1, Math.max(1, Math.floor(seg) - 1), 1); } }
}
