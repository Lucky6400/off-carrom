/* The settings rows shared by the Options screen and the in-match pause menu: label on the left, its control on the right, every row the same height. */
import { ptr } from '../input.js';
import { save, persist } from '../save.js';
import { applyVolumes, sfx } from '../audio.js';
import { text } from './font.js';
import { fillRR, fillRRr, capsule } from './ui.js';
import { clamp } from '../util.js';

export const ROW_H = 22, SETTINGS_ROWS = 5;
export const DIFFS = ['EASY', 'MEDIUM', 'HARD'];
let drag = '';
/** draws the rows starting at y; returns the height used */
export function settingsBody(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): number {
  const label = (s: string, ry: number) => text(ctx, s, x, ry + (ROW_H - 7) / 2, { color: '#ffffff', outline: '#2c1a08', bold: true });
  const cx0 = x + Math.round(w * 0.4), cw = x + w - cx0;
  const slider = (id: 'music' | 'sfx', name: string, ry: number) => {
    label(name, ry); const ty = ry + (ROW_H - 9) / 2, v = save.opts[id];
    fillRRr(ctx, cx0 - 1, ty - 1, cw + 2, 11, '#e1a569', 6.1); fillRR(ctx, cx0, ty, cw, 9, '#120b04', 3);
    fillRR(ctx, cx0, ty, Math.max(5, Math.round(cw * v)), 9, '#af6f2f', 3); fillRR(ctx, cx0 + 1, ty + 1, Math.max(3, Math.round(cw * v) - 2), 3, '#f3c496', 1.5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(cx0 + cw * v - 2), ty - 3, 4, 15);
    if (ptr.pressed && ptr.x >= cx0 - 8 && ptr.x <= cx0 + cw + 8 && ptr.y >= ty - 9 && ptr.y <= ty + 18) drag = id;
    if (drag === id && ptr.down) { save.opts[id] = clamp((ptr.x - cx0) / cw, 0, 1); applyVolumes(); }
    if (drag === id && ptr.released) { drag = ''; persist(); sfx('click'); }
  };
  const toggle = (name: string, on: boolean, ry: number, flip: () => void) => { label(name, ry); if (capsule(ctx, on ? 'ON' : 'OFF', x + w - 32, ry + (ROW_H - 18) / 2, 64, 18, on ? 'green' : 'grey')) { flip(); persist(); } };
  slider('music', 'MUSIC', y); slider('sfx', 'SOUND FX', y + ROW_H);
  toggle('VIBRATION', save.opts.vibrate, y + 2 * ROW_H, () => { save.opts.vibrate = !save.opts.vibrate; });
  toggle('HINTS', save.opts.tutorial, y + 3 * ROW_H, () => { save.opts.tutorial = !save.opts.tutorial; });
  const ry = y + 4 * ROW_H; label('DIFFICULTY', ry); const bw = (cw - 6) / 3;
  DIFFS.forEach((d, i) => { if (capsule(ctx, d, cx0 + i * (bw + 3) + bw / 2, ry + (ROW_H - 18) / 2, bw, 18, save.opts.difficulty === i ? 'gold' : 'dark', { scale: 0.8 })) { save.opts.difficulty = i; persist(); } });
  return SETTINGS_ROWS * ROW_H;
}
