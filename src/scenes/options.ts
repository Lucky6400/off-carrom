/* Options: music / sound sliders, vibration, tutorial hints, reset progress; and the Profile screen (player, level, stats, equipped gear). */
import type { Scene } from './manager.js';
import { go } from './manager.js';
import { view, X0, X1, CX } from '../config.js';
import { iconCanvas } from '../gfx/ui.js';
import { ptr, keys, inRect } from '../input.js';
import { save, persist, resetSave } from '../save.js';
import { applyVolumes, sfx, startMusic } from '../audio.js';
import { text, textWidth } from '../gfx/font.js';
import { fillRRr, menuBg, header, fillRR, capsule, panel, icon, statBar, fit } from '../gfx/ui.js';
import { topBar } from '../gfx/hud.js';
import { portrait, avatar } from '../gfx/portrait.js';
import { strikerIcon, gripIcon, powderIcon } from '../gfx/gearfx.js';
import { charById } from '../data/characters.js';
import { strikerById, gripById, powderById, xpForLevel } from '../data/items.js';
import { MODES } from '../data/modes.js';
import { LOCS } from '../data/locations.js';
import { gamesWon } from '../save.js';
import { settingsBody, ROW_H, SETTINGS_ROWS } from '../gfx/settings.js';
import { backBtn, CB } from './common.js';
import { clamp, fmt, fmtC } from '../util.js';
import type { SelectParams } from './select.js';
import { PLAYABLE } from '../data/characters.js';

export function makeOptions(): Scene {
  let confirm = false;
  return {
    enter() { confirm = false; startMusic('menu'); },
    draw(ctx) {
      menuBg(ctx, 'dark'); topBar(ctx, X0(), X1()); header(ctx, 'OPTIONS', CX(), 24, 140);
      const w = Math.min(330, view.w - 28), x = CX() - w / 2, y = 54, h = SETTINGS_ROWS * ROW_H + 14; panel(ctx, x, y, w, h, { fill: '#2c1b09' });
      settingsBody(ctx, x + 14, y + 7, w - 28);
      if (capsule(ctx, 'RESET PROGRESS', CX(), y + h + 6, 150, 19, 'red')) confirm = true;
      text(ctx, 'OFF CARROM  V0.1', CX(), view.h - view.sb - 20, { align: 'c', color: '#978a7d', outline: null });
      if (backBtn(ctx)) go('title');
      if (confirm) {
        ctx.fillStyle = 'rgba(11,6,1,0.9)'; ctx.fillRect(0, 0, view.w, view.h); header(ctx, 'ARE YOU SURE?', CX(), view.h * 0.28, 170); text(ctx, 'ALL PROGRESS WILL BE LOST', CX(), view.h * 0.28 + 34, { align: 'c', color: '#ff8a9a', outline: '#2a0010', bold: true });
        if (capsule(ctx, 'CANCEL', CX(), view.h * 0.28 + 54, 120, 20, 'green')) confirm = false;
        if (capsule(ctx, 'RESET', CX(), view.h * 0.28 + 82, 120, 20, 'red')) { resetSave(); confirm = false; applyVolumes(); startMusic('menu'); go('title'); }
      }
    },
    back() { if (confirm) { confirm = false; return true; } go('title'); return true; },
  };
}

export function makeProfile(): Scene {
  let t = 0, scroll = 0;
  return {
    enter() { t = 0; startMusic('menu'); },
    update(dt) { t += dt; },
    draw(ctx) {
      menuBg(ctx, 'dark'); topBar(ctx, X0(), X1(), 4, { profile: false }); header(ctx, 'PROFILE', CX(), 24, 140);
      const c = charById(save.char), px = X0() + 10, py = 54, pw = 118, ph = CB() - 54;
      ctx.save(); fillRRr(ctx, px - 2, py - 2, pw + 4, ph + 4, '#f5cca4', 7); ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 5); ctx.clip(); ctx.drawImage(portrait(c.id, pw, ph, 'normal', true), px, py); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 5); ctx.clip(); const pg = ctx.createLinearGradient(0, py + ph - 38, 0, py + ph); pg.addColorStop(0, 'rgba(22,13,4,0)'); pg.addColorStop(0.35, 'rgba(22,13,4,0.85)'); pg.addColorStop(1, 'rgba(22,13,4,0.95)'); ctx.fillStyle = pg; ctx.fillRect(px, py + ph - 38, pw, 38); ctx.restore();
      text(ctx, c.name, px + pw / 2, py + ph - 24, { align: 'c', bold: true, color: '#ffffff', outline: '#2c1a08', shadow: '#000000' }); text(ctx, c.title, px + pw / 2, py + ph - 12, { align: 'c', color: '#f2dac3', outline: '#2c1a08' });
      const rx = px + pw + 12, rw = X1() - 8 - rx; panel(ctx, rx, py, rw, ph, { fill: '#2c1b09' });
      // the right panel scrolls vertically (drag it, or use the arrow keys); everything inside is clipped to the panel
      const contentH = 40 + 6 * 11.5 + 4 + 76, maxScroll = Math.max(0, contentH - ph + 6);
      if (ptr.down && inRect(ptr.sx, ptr.sy, rx, py, rw, ph) && ptr.dragged) scroll -= ptr.dy; if (keys.has('ArrowDown')) scroll += 2.5; if (keys.has('ArrowUp')) scroll -= 2.5;
      scroll = clamp(scroll, 0, maxScroll);
      ctx.save(); ctx.beginPath(); ctx.roundRect(rx + 1, py + 1, rw - 2, ph - 2, 5); ctx.clip(); ctx.translate(0, -Math.round(scroll));
      icon(ctx, 'star', rx + 8, py + 7); text(ctx, `LEVEL ${save.level}`, rx + 28, py + 9, { bold: true, color: '#ffe27a', outline: '#3a2000' });
      const f = clamp(save.xp / xpForLevel(save.level), 0, 1); fillRR(ctx, rx + 8, py + 24, rw - 16, 10, '#120b04', 3); fillRR(ctx, rx + 9, py + 25, Math.max(3, (rw - 18) * f), 8, '#d7914b', 2.4); { const xs = `${fmtC(save.xp)} / ${fmtC(xpForLevel(save.level))} XP`, sc = fit(xs, rw - 24); text(ctx, xs, rx + rw / 2, py + 26 + (1 - sc) * 3, { align: 'c', outline: '#2c1a08', scale: sc }); }
      // stats
      const st = save.stats, rows: [string, string][] = [['GAMES', String(st.games)], ['WINS', String(st.wins)], ['COINS POTTED', String(st.pots)], ['BEST STREAK', String(st.bestStreak)], ['VENUES CLEARED', String(LOCS.filter((_, i) => gamesWon(i) >= 4).length) + ' / ' + LOCS.length], ['TROPHIES', String(st.trophies)]];
      rows.forEach(([k, v0], i) => { const y = py + 40 + i * 11.5, v = /^\d+$/.test(v0) ? fmtC(+v0) : v0, sc = fit(v, rw - 28 - textWidth(k)); text(ctx, k, rx + 10, y, { color: '#c0af9e', outline: null }); text(ctx, v, rx + rw - 10, y + (1 - sc) * 3, { align: 'r', color: '#ffffff', outline: '#2c1a08', scale: sc }); });
      // equipped gear
      const gy = py + 40 + rows.length * 11.5 + 4; text(ctx, 'EQUIPPED', rx + 10, gy, { color: '#ffe27a', outline: '#3a2000' });
      ctx.drawImage(strikerIcon(strikerById(save.striker), 26), rx + 10, gy + 11); ctx.drawImage(gripIcon(gripById(save.grip), 24), rx + 42, gy + 12); ctx.drawImage(powderIcon(powderById(save.powder), 24), rx + 70, gy + 12);
      { const nm = (label: string, v: string, y: number) => { text(ctx, label, rx + 10, y, { color: '#c0af9e', outline: null }); text(ctx, v, rx + rw - 10, y, { align: 'r', color: '#ffffff', outline: '#2c1a08', scale: fit(v, rw - 30 - textWidth(label)) }); };
        nm('STRIKER', strikerById(save.striker).name, gy + 44); nm('GRIP', gripById(save.grip).name, gy + 55.5); nm('POWDER', powderById(save.powder).name, gy + 67); }
      ctx.restore();
      if (maxScroll > 0 && scroll < maxScroll - 1) { const fg = ctx.createLinearGradient(0, py + ph - 16, 0, py + ph - 1); fg.addColorStop(0, 'rgba(44,27,9,0)'); fg.addColorStop(1, 'rgba(44,27,9,0.95)'); ctx.fillStyle = fg; ctx.fillRect(rx + 1, py + ph - 16, rw - 2, 15); ctx.drawImage(iconCanvas('down'), rx + rw / 2 - iconCanvas('down').width / 2, py + ph - 12); }
      if (maxScroll > 0) { const th = Math.max(14, (ph - 8) * (ph / contentH)), ty0 = py + 4 + ((ph - 8 - th) * scroll) / maxScroll; fillRR(ctx, rx + rw - 4, py + 4, 2.4, ph - 8, 'rgba(0,0,0,0.35)', 1); fillRR(ctx, rx + rw - 4, ty0, 2.4, th, '#d7914b', 1); }
      if (capsule(ctx, 'CHANGE PLAYER', X1() - 80, view.h - view.sb - 34, 130, 19, 'teal')) go('select', { title: 'SELECT PLAYER', ids: PLAYABLE.map((p) => p.id), start: save.char, owned: (id: string) => save.chars.includes(id), onPick: (id: string) => { save.char = id; persist(); go('profile'); }, onBack: () => go('profile') } as SelectParams);
      if (backBtn(ctx)) go('title');
      void avatar; void statBar; void MODES;
    },
    back() { go('title'); return true; },
  };
}
