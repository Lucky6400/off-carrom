/* Character select: a carousel of painted portrait cards (the reference's "CHARACTER SELECT"). Used by quick match (player, opponent) and the tournament. */
import type { Scene } from './manager.js';
import { go } from './manager.js';
import { view, X0, X1, CX } from '../config.js';
import { ptr } from '../input.js';
import { save } from '../save.js';
import { charById } from '../data/characters.js';
import { portrait } from '../gfx/portrait.js';
import { text, textWidth, textCanvas } from '../gfx/font.js';
import { menuBg, header, fillRR, fillRRr, icon, statBar, hit } from '../gfx/ui.js';
import { topBar } from '../gfx/hud.js';
import { sfx, startMusic } from '../audio.js';
import { backBtn, okBtn, arrows, neonFrame, clipRR } from './common.js';
import { clamp, fmt } from '../util.js';

export interface SelectParams { title: string; ids: string[]; start?: string; owned?: (id: string) => boolean; exclude?: string; onPick: (id: string) => void; onBack: () => void }

export function makeSelect(): Scene {
  let P!: SelectParams, i = 0, pos = 0, t = 0, msg = 0;
  return {
    enter(p: SelectParams) { P = p; i = Math.max(0, p.ids.indexOf(p.start ?? p.ids[0])); pos = i; t = 0; msg = 0; startMusic('menu'); },
    update(dt) { t += dt; msg -= dt; pos += (i - pos) * Math.min(1, dt * 12); },
    draw(ctx) {
      menuBg(ctx, 'green'); header(ctx, P.title, CX(), 4, Math.max(130, textWidth(P.title, { bold: true }) + 44));
      const id = P.ids[i], c = charById(id), owned = P.owned ? P.owned(id) : true, bad = P.exclude === id;
      const cw = 86, ch = 100, y0 = 40, gap = 22;
      for (let k = Math.max(0, Math.floor(pos) - 2); k <= Math.min(P.ids.length - 1, Math.ceil(pos) + 2); k++) {
        const d = k - pos, ad = Math.abs(d), s = 1 + 0.16 * Math.max(0, 1 - ad), w = cw * s, h = ch * s, x = CX() + d * (cw + gap) - w / 2, y = y0 + ch / 2 - h / 2 + 4 - 4 * Math.max(0, 1 - ad), cc = charById(P.ids[k]), lk = P.owned ? !P.owned(cc.id) : false, on = k === i;
        if (x > X1() + 10 || x + w < X0() - 10) continue;
        ctx.save(); ctx.globalAlpha = on ? 1 : Math.max(0.35, 0.78 - ad * 0.2); fillRRr(ctx, x - 2, y - 2, w + 4, h + 4, on ? '#ffffff' : '#f5cca4', 7); clipRR(ctx, x, y, w, h, 5); ctx.drawImage(portrait(cc.id, w, h, 'normal', true), x, y);
        if (lk) { ctx.fillStyle = 'rgba(15,9,3,0.6)'; ctx.fillRect(x, y, w, h); icon(ctx, 'lock', x + w / 2, y + h / 2, { center: true }); }
        ctx.restore(); ctx.restore(); if (hit(x, y, w, h, true).click) { if (on) { if (owned && !bad) { sfx('click'); P.onPick(id); } else { sfx('error'); msg = 1.4; } } else { i = k; sfx('tick'); } }
      }
      // name / title / stats
      const ny = y0 + ch + 14; const tc = textCanvas(c.name, { scale: 1.3, bold: true, slant: 0.15, color: '#ffffff', color2: '#fae3cd', outline: '#2c1a08', shadow: '#000000' }); ctx.drawImage(tc, Math.round(CX() - tc.width / 2), ny);
      text(ctx, c.title, CX(), ny + 19, { align: 'c', color: '#f2dac3', outline: '#2c1a08' });
      const sw = Math.min(140, (view.w - 50) / 3), sx0 = CX() - sw * 1.5 + 3, sy = ny + 34;
      if (owned && !bad) { statBar(ctx, sx0, sy, sw - 8, 'POWER', c.power, '#ff8a3a', 10, 36); statBar(ctx, sx0 + sw, sy, sw - 8, 'CONTROL', c.control, '#f2bd87', 10, 42); statBar(ctx, sx0 + sw * 2, sy, sw - 8, 'SPIN', c.spin, '#c060ff', 10, 28); }
      else if (bad) text(ctx, 'ALREADY CHOSEN', CX(), sy, { align: 'c', color: '#ff8a9a', outline: '#2a0010' });
      else { const s = `${fmt(c.price)} IN THE SHOP`, tw = textWidth(s); icon(ctx, 'coin', Math.round(CX() - (tw + 16) / 2), sy - 3); text(ctx, s, CX() + 8, sy, { align: 'c', color: '#ffd23a', outline: '#3a2000' }); }
      if (msg > 0) text(ctx, bad ? 'PICK A DIFFERENT PLAYER' : 'UNLOCK THIS PLAYER IN THE SHOP', CX(), y0 + ch / 2, { align: 'c', color: '#ffffff', outline: '#2c1a08', bold: true, alpha: clamp(msg * 2, 0, 1) });
      const d = arrows(ctx, X0() + 14, X1() - 14, y0 + ch / 2, i > 0, i < P.ids.length - 1, 11); if (d) { i += d; sfx('tick'); }
      if (ptr.swipe) { const n = clamp(i + ptr.swipe, 0, P.ids.length - 1); if (n !== i) { i = n; sfx('tick'); } }
      if (backBtn(ctx)) P.onBack(); if (okBtn(ctx, 'SELECT', { disabled: !owned || bad })) P.onPick(id);
    },
    back() { P.onBack(); return true; },
  };
}
void save;
