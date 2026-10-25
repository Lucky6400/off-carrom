/* HUD pieces shared by menus and the match: glossy pills (coins, level), the profile bar, big banners. */
import { fillRR, fillRRr, icon, iconCanvas, COL, alpha } from './ui.js';
import { text, textWidth, textCanvas } from './font.js';
import { avatar } from './portrait.js';
import { save } from '../save.js';
import { charById, shortName } from '../data/characters.js';
import { xpForLevel } from '../data/items.js';
import { fmtC as fmt, clamp } from '../util.js';
import { view } from '../config.js';

export function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = '#1d1207', line = COL.mint) {
  ctx.save(); ctx.shadowColor = line; ctx.shadowBlur = 4; fillRR(ctx, x, y, w, h, line, 4); ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, fill); g.addColorStop(1, '#0f0902'); fillRR(ctx, x + 1, y + 1, w - 2, h - 2, g, 3.4);
  const hg = ctx.createLinearGradient(0, y, 0, y + h / 2); hg.addColorStop(0, 'rgba(255,255,255,0.2)'); hg.addColorStop(1, 'rgba(255,255,255,0)'); fillRR(ctx, x + 2, y + 1.5, w - 4, h / 2 - 1, hg, 3); ctx.restore();
}
/** width a coin pill needs for this amount (it grows with the number) */
export const coinPillW = (coins: number, min = 58) => Math.max(min, Math.ceil(textWidth(fmt(coins)) + 29));
export function coinPill(ctx: CanvasRenderingContext2D, x: number, y: number, coins: number, minW = 58): number {
  const w = coinPillW(coins, minW); pill(ctx, x, y, w, 17, '#3a2c08', COL.gold); const ic = iconCanvas('coin'); ctx.drawImage(ic, x + 3, y + (17 - ic.height) / 2); text(ctx, fmt(coins), x + 21, y + 5, { color: '#ffe27a', outline: '#3a2000' }); return w;
}
/** star + level number + xp bar. The number sits right after the star and the bar takes the rest, so any level (or a huge number) lays out cleanly */
const levelTxt = () => fmt(save.level);
export const levelPillW = () => Math.max(64, Math.ceil(textWidth(levelTxt()) + 20 + 6 + 36 + 6));
export function levelPill(ctx: CanvasRenderingContext2D, x: number, y: number, w = levelPillW()) {
  pill(ctx, x, y, w, 17, '#2c1b0a', COL.mint); const f = clamp(save.xp / Math.max(1, xpForLevel(save.level)), 0, 1), tw = Math.ceil(textWidth(levelTxt())), bx = x + 20 + tw + 6, bw = x + w - 6 - bx;
  { const ic = iconCanvas('star'); ctx.drawImage(ic, x + 3, y + (17 - ic.height) / 2); } text(ctx, levelTxt(), x + 20, y + 5, { color: '#ffffff', outline: '#2c1a08' });
  fillRR(ctx, bx, y + 6, bw, 5, '#120b04', 1.5); if (f > 0.02) fillRR(ctx, bx, y + 6, Math.max(3, bw * f), 5, '#d7914b', 1.5);
}
/** profile strip: avatar + name pill (top left of menus) */
export function profilePill(ctx: CanvasRenderingContext2D, x: number, y: number, w = 90) {
  const c = charById(save.char); pill(ctx, x + 12, y + 3, w - 12, 15, '#2c1b0a', COL.mint); text(ctx, shortName(c), x + 36, y + 7.4, { color: '#ffffff', outline: '#2c1a08' });
  ctx.drawImage(avatar(save.char, 24, 'normal', COL.mint), x, y - 1);
}
/** coins + level pills, right aligned to x1, each as wide as its number needs */
export function rightPills(ctx: CanvasRenderingContext2D, x1: number, y = 4) {
  const lw = levelPillW(), cw = coinPillW(save.coins, 62); levelPill(ctx, x1 - 4 - lw, y, lw); coinPill(ctx, x1 - 4 - lw - 6 - cw, y, save.coins, 62);
}
/** the usual top bar of the menu screens */
export function topBar(ctx: CanvasRenderingContext2D, x0: number, x1: number, y = 4, o: { profile?: boolean } = {}) {
  if (o.profile !== false) profilePill(ctx, x0 + 4, y, 86);
  rightPills(ctx, x1, y);
}

export interface Banner { text: string; sub?: string; tone: 'good' | 'bad' | 'info' | 'gold'; t: number; dur: number }
const TONE = { good: ['#d7914b', '#6f4115', '#fae3cd'], bad: ['#ff5a6a', '#8a0a1a', '#ffc8d0'], info: ['#4aa8ff', '#143a8a', '#c8e0ff'], gold: ['#ffdc4a', '#b86a0a', '#fff8c0'] };
/** a ribbon with a big title (and a smaller line below) that pops in and fades out */
export function bigBanner(ctx: CanvasRenderingContext2D, b: Banner, cx: number, cy: number, maxW = 300) {
  const k = clamp(b.t / 0.18, 0, 1), out = clamp((b.dur - b.t) / 0.25, 0, 1), a = Math.min(out, k), sc = 0.7 + 0.3 * (1 - Math.pow(1 - k, 3));
  if (a <= 0) return; const S = TONE[b.tone];
  const tc = textCanvas(b.text, { scale: 2, bold: true, slant: 0.2, color: '#ffffff', color2: S[2], outline: S[1], shadow: '#000000' }), sw0 = b.sub ? textWidth(b.sub) : 0, tw = Math.min(maxW, Math.max(tc.width + 44, sw0 + 32)), h = b.sub ? 54 : 32, x = cx - tw / 2, y = cy - h / 2;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
  ctx.shadowColor = alpha(S[0], 0.7); ctx.shadowBlur = 10; fillRRr(ctx, x - 1.5, y - 1.5, tw + 3, h + 3, S[2], 10); ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, S[0]); g.addColorStop(1, S[1]); fillRR(ctx, x, y, tw, h, g, 5);
  const hg = ctx.createLinearGradient(0, y, 0, y + h * 0.5); hg.addColorStop(0, 'rgba(255,255,255,0.45)'); hg.addColorStop(1, 'rgba(255,255,255,0)'); fillRR(ctx, x + 2, y + 1.5, tw - 4, h * 0.45, hg, 4);
  ctx.drawImage(tc, Math.round(cx - tc.width / 2), Math.round(y + (b.sub ? 8 : (h - tc.height) / 2)));
  if (b.sub) text(ctx, b.sub, cx, y + h - 17, { align: 'c', scale: Math.min(1, (tw - 20) / Math.max(1, sw0)), color: '#ffffff', outline: S[1] });
  ctx.restore();
}
export const w2 = () => view.w;
export { textWidth };
