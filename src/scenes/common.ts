/* Small helpers shared by the menu scenes: bottom corner buttons, arrows, neon frames, carousels. */
import { view, X0, X1 } from '../config.js';
import { ptr } from '../input.js';
import { roundBtn, fillRRr, alpha, icon } from '../gfx/ui.js';
import { text } from '../gfx/font.js';
import { hit } from '../gfx/ui.js';

/** content bottom: leave the corner button band (y >= 203) free */
export const CB = () => view.h - view.sb - 40;
export const BY = () => view.h - view.sb - 22;
type Ctx = CanvasRenderingContext2D;

/** BACK button in the bottom-left corner (round arrow + label), like the reference */
export function backBtn(ctx: Ctx, label = 'BACK'): boolean {
  const r = roundBtn(ctx, 'back', X0() + 24, BY(), 15, 'dark');
  text(ctx, label, X0() + 44, BY() - 4, { color: '#ffffff', outline: '#2c1a08', bold: true });
  return r;
}
/** confirm (tick) button in the bottom-right corner with an optional label on its left */
export function okBtn(ctx: Ctx, label = '', o: { disabled?: boolean; icon?: 'tick' | 'play' | 'right' } = {}): boolean {
  const r = roundBtn(ctx, o.icon ?? 'tick', X1() - 24, BY(), 15, 'green', { disabled: o.disabled });
  if (label) text(ctx, label, X1() - 44, BY() - 4, { color: o.disabled ? '#7a9488' : '#ffffff', outline: '#2c1a08', bold: true, align: 'r' });
  return r;
}
/** left / right chevrons; returns -1, 1 or 0 */
export function arrows(ctx: Ctx, xl: number, xr: number, cy: number, canL: boolean, canR: boolean, r = 11): number {
  let d = 0; if (canL && roundBtn(ctx, 'left', xl, cy, r, 'teal')) d = -1; if (canR && roundBtn(ctx, 'right', xr, cy, r, 'teal')) d = 1; return d;
}
/** rounded card frame with a neon glow */
export function neonFrame(ctx: Ctx, x: number, y: number, w: number, h: number, col: string, r = 6, glow = 14) {
  ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = glow; fillRRr(ctx, x - 2, y - 2, w + 4, h + 4, col, r + 2); ctx.restore();
}
/** clip to a rounded rect (caller restores) */
export function clipRR(ctx: Ctx, x: number, y: number, w: number, h: number, r = 5) { ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip(); }
/** swipe from the last release: -1 (previous) / +1 (next) / 0 */
export const swiped = () => ptr.swipe;
/** is the click inside a rect (and not a drag)? silent variant of hit */
export function tapped(x: number, y: number, w: number, h: number): boolean { return hit(x, y, w, h, true).click; }
export function lockBadge(ctx: Ctx, cx: number, cy: number) { icon(ctx, 'lock', cx, cy, { center: true }); }
void alpha;
