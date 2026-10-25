/* Shop (the reference's gear screen): tabs for cues, gloves, chalk, power-ups and players; a detail panel on the left (art, stats, buy / equip) and a 4 x 2 grid of
   tiles on the right with padlocks and the level that unlocks them. */
import type { Scene } from './manager.js';
import { go } from './manager.js';
import { view, X0, X1, CX } from '../config.js';
import { ptr } from '../input.js';
import { save, persist, addCoins, addPower, powerCount } from '../save.js';
import { STRIKERS, GRIPS, POWDERS, POWERS, strikerById, gripById, powderById, type StrikerDef, type GripDef, type PowderDef, type PowerDef } from '../data/items.js';
import { PLAYABLE, charById, type CharDef } from '../data/characters.js';
import { portrait, avatar } from '../gfx/portrait.js';
import { strikerIcon, gripIcon, powderIcon, powerIcon } from '../gfx/gearfx.js';
import { text, textWidth, wrap } from '../gfx/font.js';
import { menuBg, fillRR, fillRRr, icon, iconCanvas, capsule, panel, statBar, hit, COL, roundBtn, fit } from '../gfx/ui.js';
import { topBar } from '../gfx/hud.js';
import { sfx, startMusic } from '../audio.js';
import { backBtn, CB } from './common.js';
import { clamp, fmt } from '../util.js';

type Tab = 0 | 1 | 2 | 3 | 4;
const TABS = ['STRIKERS', 'GRIPS', 'POWDER', 'POWER-UPS', 'PLAYERS'], BLURB = ['LONGER STRIKERS STRETCH YOUR AIM LINE AND ADD A LITTLE POWER.', 'GRIPS STEADY YOUR FLICK: LESS SHAKE ON A POWERFUL SHOT.', 'POWDER MAKES THE BOARD SLICKER SO COINS GLIDE FARTHER.', 'USE THEM IN A MATCH WITH THE LIGHTNING BUTTON.', 'UNLOCK NEW PLAYERS TO BATTLE WITH.'];
type Item = StrikerDef | GripDef | PowderDef | PowerDef | CharDef;

export function makeShop(): Scene {
  let tab: Tab = 0, sel = 0, page = 0, msg = '', msgT = 0, back = 'title', backP: any, t = 0;
  const items = (): Item[] => (tab === 0 ? STRIKERS : tab === 1 ? GRIPS : tab === 2 ? POWDERS : tab === 3 ? POWERS : PLAYABLE);
  const owned = (it: Item) => tab === 0 ? save.strikers.includes(it.id) : tab === 1 ? save.grips.includes(it.id) : tab === 2 ? save.powders.includes(it.id) : tab === 4 ? save.chars.includes(it.id) : false;
  const equipped = (it: Item) => tab === 0 ? save.striker === it.id : tab === 1 ? save.grip === it.id : tab === 2 ? save.powder === it.id : tab === 4 ? save.char === it.id : false;
  const levelOf = (it: Item) => (tab <= 2 ? (it as StrikerDef).level : 1);
  const priceOf = (it: Item) => (tab === 4 ? (it as CharDef).price : (it as StrikerDef).price);
  const toTab = (n: Tab) => { tab = n; page = 0; const its = items(); sel = Math.max(0, its.findIndex((x) => equipped(x))); if (sel < 0) sel = 0; page = Math.floor(sel / (view.w < 400 ? 6 : 8)); };
  const buy = (it: Item, n = 1) => {
    const cost = priceOf(it) * n; if (save.coins < cost) { sfx('error'); msg = 'NOT ENOUGH COINS'; msgT = 1.4; return; }
    if (tab <= 2 && levelOf(it) > save.level) { sfx('error'); msg = `NEEDS LEVEL ${levelOf(it)}`; msgT = 1.4; return; }
    addCoins(-cost);
    if (tab === 0) save.strikers.push(it.id); else if (tab === 1) save.grips.push(it.id); else if (tab === 2) save.powders.push(it.id); else if (tab === 4) save.chars.push(it.id); else addPower((it as PowerDef).id, n);
    persist(); sfx('buy'); msg = tab === 3 ? `+${n} ${it.name}` : 'PURCHASED!'; msgT = 1.4;
  };
  const equip = (it: Item) => { if (tab === 0) save.striker = it.id; else if (tab === 1) save.grip = it.id; else if (tab === 2) save.powder = it.id; else if (tab === 4) save.char = it.id; persist(); sfx('buy'); msg = 'EQUIPPED!'; msgT = 1.2; };

  function art(ctx: CanvasRenderingContext2D, it: Item, cx: number, cy: number, big: boolean) {
    if (tab === 0) { const s = big ? 56 : 36; ctx.drawImage(strikerIcon(it as StrikerDef, s), cx - s / 2, cy - s / 2); }
    else if (tab === 1) { const s = big ? 54 : 34; ctx.drawImage(gripIcon(it as GripDef, s), cx - s / 2, cy - s / 2); }
    else if (tab === 2) { const s = big ? 54 : 34; ctx.drawImage(powderIcon(it as PowderDef, s), cx - s / 2, cy - s / 2); }
    else if (tab === 3) { const s = big ? 38 : 26; ctx.drawImage(powerIcon(it as PowerDef, s), cx - s / 2, cy - s / 2); }
    else { const w = big ? 34 : 24, h = Math.round(w * 1.2); ctx.save(); ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 4); ctx.clip(); ctx.drawImage(portrait(it.id, w, h, 'normal', true), cx - w / 2, cy - h / 2); ctx.restore(); }
  }
  return {
    enter(p?: { back?: string; tab?: Tab }) { back = p?.back ?? 'title'; backP = p; t = 0; msg = ''; startMusic('menu'); toTab(p?.tab ?? 0); },
    update(dt) { t += dt; msgT -= dt; },
    draw(ctx) {
      menuBg(ctx, 'dark'); topBar(ctx, X0(), X1());
      // tabs
      const tx0 = X0() + 6, tw = (X1() - X0() - 12 - 4 * 4) / 5;
      TABS.forEach((n, i) => { const x = tx0 + i * (tw + 4), on = i === tab; ctx.save(); ctx.shadowColor = on ? '#edca5c' : '#c7893b'; ctx.shadowBlur = on ? 9 : 2; fillRR(ctx, x - 1, 25, tw + 2, 21, on ? '#edca5c' : '#c7893b', 6); ctx.restore(); const g = ctx.createLinearGradient(0, 26, 0, 45); g.addColorStop(0, on ? '#754b1f' : '#442a10'); g.addColorStop(1, on ? '#523212' : '#261809'); fillRR(ctx, x, 26, tw, 19, g, 5); text(ctx, n, x + tw / 2, 31, { align: 'c', bold: true, scale: textWidth(n, { bold: true }) > tw - 6 ? 0.78 : 0.92, color: on ? '#ffffff' : '#f2dac3', outline: '#2c1a08' }); if (hit(x, 26, tw, 19, true).click && !on) { sfx('click'); toTab(i as Tab); } });
      const its = items(), it = its[sel] ?? its[0], own = tab === 3 ? false : owned(it), eq = equipped(it), lvl = levelOf(it), lockedByLevel = tab <= 2 && lvl > save.level && !own;
      // left detail panel
      const lx = X0() + 6, lw = Math.min(124, view.w * 0.34), ly = 52, lh = CB() - 52; panel(ctx, lx, ly, lw, lh, { fill: '#2c1b09' });
      // preview box
      fillRRr(ctx, lx + 5, ly + 5, lw - 10, 48, '#120b04', 6.8); const pg = ctx.createLinearGradient(0, ly + 5, 0, ly + 53); pg.addColorStop(0, '#533516'); pg.addColorStop(1, '#1f1407'); fillRRr(ctx, lx + 6, ly + 6, lw - 12, 46, pg, 5.8);
      ctx.save(); ctx.beginPath(); ctx.roundRect(lx + 6, ly + 6, lw - 12, 46, 5.8); ctx.clip(); art(ctx, it, lx + lw / 2, ly + 29, true); ctx.restore();
      if (lockedByLevel) { ctx.fillStyle = 'rgba(13,8,3,0.5)'; ctx.fillRect(lx + 6, ly + 6, lw - 12, 46); icon(ctx, 'lock', lx + lw - 16, ly + 16, { center: true }); }
      if (eq) { fillRR(ctx, lx + 10, ly + 38, 52, 11, '#d78d4b', 3); text(ctx, 'EQUIPPED', lx + 36, ly + 39.6, { align: 'c', color: '#ffffff', outline: '#442810' }); }
      const nm = it.name, ns = fit(nm, lw - 10, { bold: true }, 1); text(ctx, nm, lx + lw / 2, ly + 59, { align: 'c', bold: true, scale: ns, color: '#ffffff', outline: '#2c1a08' });
      let sy = ly + 73;
      if (tab === 0) { const c = it as StrikerDef; statBar(ctx, lx + 6, sy, lw - 12, 'AIM', Math.round(c.aim / 0.65), '#f2bd87', 10, 38); statBar(ctx, lx + 6, sy + 11, lw - 12, 'POWER', Math.round((c.power - 1) / 0.025), '#ff8a3a', 10, 38); sy += 24; }
      else if (tab === 1) { statBar(ctx, lx + 6, sy, lw - 12, 'STEADY', Math.round((it as GripDef).control * 10), '#f2bd87', 10, 34); sy += 13; }
      else if (tab === 2) { statBar(ctx, lx + 6, sy, lw - 12, 'GLIDE', Math.round(((it as PowderDef).glide - 1) / 0.035), '#c060ff', 10, 30); sy += 13; }
      else if (tab === 4) { const c = it as CharDef; statBar(ctx, lx + 6, sy, lw - 12, 'POWER', c.power, '#ff8a3a', 10, 42); statBar(ctx, lx + 6, sy + 11, lw - 12, 'CONTROL', c.control, '#f2bd87', 10, 42); statBar(ctx, lx + 6, sy + 22, lw - 12, 'TOUCH', c.spin, '#c060ff', 10, 42); sy += 35; }
      else { wrap((it as PowerDef).desc, lw - 12).slice(0, 4).forEach((ln, i) => text(ctx, ln, lx + 6, sy + i * 9.5, { color: '#fbecdc', outline: null })); sy += 38; { const on = `OWNED ${powerCount((it as PowerDef).id)}`, bw0 = textWidth(on) + 10; fillRR(ctx, lx + lw - 6 - bw0 - 2, ly + 9, bw0, 12, '#2c1a08', 3.5); text(ctx, on, lx + lw - 8 - bw0 / 2, ly + 11.8, { align: 'c', color: '#ffe27a', outline: null }); } }
      if (tab <= 2 && sy + 11 < ly + lh - 24) { wrap((it as StrikerDef).desc.toUpperCase(), lw - 12).slice(0, 2).forEach((ln, i) => text(ctx, ln, lx + 6, sy + 1 + i * 9.5, { color: '#f2dac3', outline: null })); sy += 19; }
      // action
      const ay = ly + lh - 24, mid = lx + lw / 2;
      if (tab === 3) { const pr = priceOf(it), can1 = save.coins >= pr, can5 = save.coins >= pr * 5, bw0 = (lw - 12 - 4) / 2; if (capsule(ctx, `BUY ${pr}`, lx + 6 + bw0 / 2, ay, bw0, 17, can1 ? 'green' : 'grey', { disabled: !can1, scale: 0.85 })) buy(it, 1); if (capsule(ctx, `X5 ${pr * 5}`, lx + lw - 6 - bw0 / 2, ay, bw0, 17, can5 ? 'gold' : 'grey', { disabled: !can5, scale: 0.85 })) buy(it, 5); }
      else if (!own) { const pr = priceOf(it), can = save.coins >= pr && !lockedByLevel; if (lockedByLevel) { text(ctx, `UNLOCKS AT LEVEL ${lvl}`, mid, ay + 4, { align: 'c', color: '#ffb0bc', outline: '#2c1a08', bold: true }); } else { icon(ctx, 'coin', mid - 46, ay + 2); text(ctx, fmt(pr), mid - 31, ay + 5, { color: can ? '#ffd23a' : '#ff6a8a', outline: '#3a2000' }); if (capsule(ctx, 'BUY', mid + 32, ay, 52, 17, can ? 'green' : 'grey', { disabled: !can })) buy(it); } }
      else if (!eq) { if (capsule(ctx, 'EQUIP', mid, ay, 84, 17, 'teal')) equip(it); } else text(ctx, 'IN USE', mid, ay + 4, { align: 'c', color: '#f2b987', outline: '#35210f', bold: true });
      if (msgT > 0) text(ctx, msg, lx + lw + (X1() - lx - lw) / 2, 70, { align: 'c', bold: true, scale: 1.2, color: '#ffd23a', outline: '#3a2000', alpha: clamp(msgT * 2, 0, 1) });
      // grid
      const gx = lx + lw + 8, gw = X1() - 6 - gx, cols = view.w < 400 ? 3 : 4, gap = 5, tw2 = (gw - gap * (cols - 1)) / cols, th = Math.min(66, (CB() - 52 - 20 - gap) / 2), per = cols * 2, start = page * per;
      its.slice(start, start + per).forEach((x, k) => {
        const idx = start + k, cx = gx + (k % cols) * (tw2 + gap), cy = 52 + Math.floor(k / cols) * (th + gap), on = idx === sel, ow = tab === 3 ? false : owned(x), lk = tab <= 2 && levelOf(x) > save.level && !ow, e2 = equipped(x);
        ctx.save(); ctx.shadowColor = on ? '#edca5c' : '#c7893b'; ctx.shadowBlur = on ? 10 : 0; fillRRr(ctx, cx - 1.5, cy - 1.5, tw2 + 3, th + 3, on ? '#edca5c' : lk ? '#554029' : '#8f6335', 8.3); ctx.restore();
        const g = ctx.createLinearGradient(0, cy, 0, cy + th); g.addColorStop(0, on ? '#613d18' : lk ? '#26180a' : '#442a10'); g.addColorStop(1, on ? '#3c250d' : lk ? '#160e05' : '#261809'); fillRR(ctx, cx, cy, tw2, th, g, 4);
        ctx.save(); ctx.beginPath(); ctx.roundRect(cx + 1, cy + 1, tw2 - 2, th - 2, 3); ctx.clip(); ctx.globalAlpha = lk ? 0.35 : 1; art(ctx, x, cx + tw2 / 2, cy + th * 0.29, false); ctx.restore();
        text(ctx, x.name, cx + tw2 / 2, cy + th - 26, { align: 'c', scale: fit(x.name, tw2 - 8, {}, 0.9), color: lk ? '#7a9488' : '#ffffff', outline: '#2c1a08' });
        if (lk) { icon(ctx, 'lock', cx + tw2 / 2, cy + th * 0.29, { center: true }); text(ctx, `LEVEL ${levelOf(x)}`, cx + tw2 / 2, cy + th - 10, { align: 'c', scale: fit(`LEVEL ${levelOf(x)}`, tw2 - 6, {}, 1), color: '#ffb0bc', outline: '#2c1a08' }); }
        else if (tab === 3) { { const pt = String((x as PowerDef).price), gw0 = 15 + textWidth(pt), gx0 = cx + (tw2 - gw0) / 2; icon(ctx, 'coin', gx0, cy + th - 12.5); text(ctx, pt, gx0 + 15, cy + th - 10, { color: '#ffd23a', outline: '#3a2000' }); } const n = powerCount((x as PowerDef).id); if (n) { fillRR(ctx, cx + tw2 - 18, cy + 3, 15, 11, '#2c1a08', 3); text(ctx, String(n), cx + tw2 - 10.5, cy + 4.6, { align: 'c', outline: null }); } }
        else if (ow) { if (e2) { fillRR(ctx, cx + 3, cy + th - 13, tw2 - 6, 10, '#d78d4b', 3); text(ctx, 'EQUIPPED', cx + tw2 / 2, cy + th - 11.6, { align: 'c', color: '#ffffff', outline: '#442810', scale: fit('EQUIPPED', tw2 - 10, {}, 0.85) }); } else text(ctx, 'OWNED', cx + tw2 / 2, cy + th - 10, { align: 'c', color: '#f2b987', outline: '#35210f' }); }
        else { const pt = fmt(priceOf(x)), gw0 = 15 + textWidth(pt), gx0 = cx + (tw2 - gw0) / 2; icon(ctx, 'coin', gx0, cy + th - 12.5); text(ctx, pt, gx0 + 15, cy + th - 10, { color: '#ffd23a', outline: '#3a2000' }); }
        if (hit(cx, cy, tw2, th, true).click) { if (on) { if (tab === 3) buy(x, 1); else if (!ow && !lk) buy(x); else if (ow && !e2) equip(x); } else { sel = idx; sfx('tick'); } }
      });
      const pages = Math.ceil(its.length / per); if (page >= pages) page = Math.max(0, pages - 1); if (pages > 1) { const py = 52 + 2 * (th + gap) + 2; if (page > 0 && roundBtn(ctx, 'left', gx + gw / 2 - 30, py + 7, 8, 'teal')) { page--; sel = page * per; } text(ctx, `${page + 1} / ${pages}`, gx + gw / 2, py + 3, { align: 'c', color: '#f2dac3', outline: '#2c1a08' }); if (page < pages - 1 && roundBtn(ctx, 'right', gx + gw / 2 + 30, py + 7, 8, 'teal')) { page++; sel = page * per; } }
      if (ptr.swipe && ptr.sx > gx) { const n = clamp(page + ptr.swipe, 0, Math.max(0, pages - 1)); if (n !== page) { page = n; sel = page * per; sfx('tick'); } }
      if (backBtn(ctx)) go(back, backP);
      void strikerById; void gripById; void powderById; void charById; void avatar; void iconCanvas; void COL;
    },
    back() { go(back, backP); return true; },
  };
}
