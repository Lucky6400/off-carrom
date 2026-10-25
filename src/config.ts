/* Shared constants. The logical screen is 240 high and `view.w` wide (the width follows the screen ratio, 340..560), drawn at `view.rs` device
   pixels per logical pixel. The canvas always covers the whole screen; content stays inside the safe area (notch / home indicator insets). */
export const H = 240;
export const MIN_W = 340;
export const MAX_W = 560;
/* w = logical width; sl / sr / st / sb = unsafe strips (notch, home indicator) in logical px */
export const view = { w: 427, h: H, rs: 3, sl: 0, sr: 0, st: 0, sb: 0 };
export function setView(w: number, rs: number, sl = 0, sr = 0, st = 0, sb = 0) { view.w = Math.round(Math.max(MIN_W, Math.min(MAX_W, w))); view.rs = rs; view.sl = sl; view.sr = sr; view.st = st; view.sb = sb; }
/** left / right / top / bottom of the area scenes should lay content out in */
export const X0 = () => view.sl;
export const X1 = () => view.w - view.sr;
export const Y0 = () => view.st;
export const Y1 = () => view.h - view.sb;
export const CX = () => (view.sl + view.w - view.sr) / 2;
export const SAVE_KEY = 'offcarrom.save.v1';
export const GAME_NAME = 'OFF CARROM';
