/* Career flow: the hub (horizontally scrolling Battle It Out / Shop / Tutorial), the hall carousel (map) and a pool hall (the four games against the boss). */
import type { Scene } from './manager.js';
import { go } from './manager.js';
import { view, X0, X1, CX, Y0 } from '../config.js';
import { ptr } from '../input.js';
import { save, gameWon, gamesWon, locDone, unlockedLoc, nextGame, careerGame, persist } from '../save.js';
import { LOCS } from '../data/locations.js';
import { charById } from '../data/characters.js';
import { modeById, type GameId } from '../data/modes.js';
import { powerById } from '../data/items.js';
import { hallArt } from '../gfx/halls.js';
import { cardArt, type CardKind } from '../gfx/cards.js';
import { portrait, avatar } from '../gfx/portrait.js';
import { modeBadge, miniRack } from '../gfx/coins.js';
import { powerIcon } from '../gfx/gearfx.js';
import { text, textWidth, wrap, textCanvas } from '../gfx/font.js';
import { fillRRr, menuBg, header, panel, fillRR, icon, iconCanvas, capsule, COL, alpha, hit, titleBlock, fit } from '../gfx/ui.js';
import { topBar } from '../gfx/hud.js';
import { sfx, startMusic } from '../audio.js';
import { backBtn, okBtn, arrows, neonFrame, clipRR, BY, CB } from './common.js';
import { clamp, shade } from '../util.js';
import type { PlayCfg } from '../game/finish.js';

/* ============================================================ HUB */
const HUB = [
  { id: 'battle', title: 'BATTLE IT OUT', desc: 'TAKE ON TEN VENUES AND BEAT THEIR BOSSES.', card: 'map' as CardKind, say: 'READY TO FIGHT YOUR WAY UP?' },
  { id: 'shop', title: 'PRO SHOP', desc: 'STRIKERS, GRIPS, CHALK, POWER-UPS AND NEW PLAYERS.', card: 'shop' as CardKind, say: 'NEW GEAR MAKES A NEW GAME.' },
  { id: 'school', title: 'TUTORIAL', desc: 'LEARN EVERY CONTROL WITH COACH PEPPER.', card: 'school' as CardKind, say: 'LET ME SHOW YOU THE ROPES.' },
];
export function makeHub(): Scene {
  let sel = 0, pos = 0, t = 0;
  const open = () => {
    const it = HUB[sel];
    if (it.id === 'battle') go('map'); else if (it.id === 'shop') go('shop', { back: 'hub' });
    else go('loading', { mode: 'classic', loc: 0, player: save.char, opp: 'coach', kind: 'tutorial', bet: 0, title: 'TUTORIAL' } as PlayCfg);
  };
  return {
    enter(p?: { from?: string }) { sel = p?.from === 'shop' ? 1 : p?.from === 'tutorial' ? 2 : 0; pos = sel; t = 0; startMusic('menu'); },
    update(dt) { t += dt; pos += (sel - pos) * Math.min(1, dt * 11); },
    draw(ctx) {
      ctx.drawImage(hallArt(0, view.w, view.h), 0, 0); ctx.fillStyle = 'rgba(16,9,3,0.74)'; ctx.fillRect(0, 0, view.w, view.h);
      topBar(ctx, X0(), X1());
      // coach in a framed card on the right; everything else lives left of it
      const cw0 = 74, ch0 = 90, cx1 = X1() - 8 - cw0, cy1 = 44; neonFrame(ctx, cx1, cy1, cw0, ch0, '#f2bd87', 6, 8); clipRR(ctx, cx1, cy1, cw0, ch0, 6); ctx.drawImage(portrait('coach', cw0, ch0, 'happy', true), cx1, cy1); ctx.restore();
      const areaR = cx1 - 14, cx = (X0() + areaR) / 2, cw = clamp((areaR - X0()) * 0.42, 100, 142), chh = Math.round(cw * 0.62), cy = 82;
      ctx.save(); ctx.beginPath(); ctx.rect(X0(), 22, areaR - X0(), 118); ctx.clip();
      for (let i = 0; i < HUB.length; i++) {
        const d = i - pos, ad = Math.abs(d), k = 1.14 - Math.min(1, ad) * 0.38, w = cw * k, h = chh * k, x = cx + d * (cw + 8) * 0.92 - w / 2, y = cy - h / 2 + Math.sin(t * 2 + i) * (i === sel ? 1.2 : 0), on = i === sel;
        if (x > areaR + 20 || x + w < X0() - 20) continue;
        ctx.save(); ctx.globalAlpha = on ? 1 : 0.6; neonFrame(ctx, x, y, w, h, on ? '#f2bd87' : '#805a34', 6, on ? 16 : 4); clipRR(ctx, x, y, w, h, 6); ctx.drawImage(cardArt(HUB[i].card, w, h), x, y); ctx.restore(); ctx.restore();
        if (hit(x, y, w, h, true).click) { if (on) open(); else { sel = i; sfx('tick'); } }
      }
      ctx.restore();
      // name bar, description, then arrows with dots between them (each with its own margin)
      const it = HUB[sel], by2 = cy + chh * 1.14 / 2 + 10, bw2 = areaR - X0();
      const g = ctx.createLinearGradient(0, by2, 0, by2 + 22); g.addColorStop(0, 'rgba(55,33,10,0.95)'); g.addColorStop(1, 'rgba(25,15,5,0.95)'); ctx.fillStyle = g; ctx.fillRect(X0(), by2, bw2, 22); ctx.fillStyle = '#d7914b'; ctx.fillRect(X0(), by2, bw2, 1.4); ctx.fillRect(X0(), by2 + 21, bw2, 1);
      text(ctx, it.title, cx, by2 + 6, { align: 'c', scale: fit(it.title, bw2 - 16, { bold: true }, 1.12), bold: true, color: '#ffe27a', outline: '#3a2000', shadow: '#000000' });
      text(ctx, it.desc, cx, by2 + 31, { align: 'c', scale: fit(it.desc, bw2 - 12, {}, 1), color: '#ffffff', outline: '#2c1a08' });
      const ay = by2 + 52, dir = arrows(ctx, cx - 38, cx + 38, ay, sel > 0, sel < HUB.length - 1, 9); if (dir) { sel += dir; sfx('tick'); }
      if (ptr.swipe) { const n = clamp(sel + ptr.swipe, 0, HUB.length - 1); if (n !== sel) { sel = n; sfx('tick'); } }
      for (let i = 0; i < HUB.length; i++) fillRR(ctx, cx - 16 + i * 11, ay - 1.5, 7, 3, i === sel ? '#ffffff' : '#644a30', 1);
      if (backBtn(ctx)) go('title'); if (okBtn(ctx, 'GO')) open();
    },
    back() { go('title'); return true; },
  };
}
import { roundBtn } from '../gfx/ui.js';
const roundArrow = (ctx: CanvasRenderingContext2D, x: number, y: number) => roundBtn(ctx, 'right', x, y, 12, 'teal');

/* ============================================================ MAP (hall carousel) */
export function makeMap(): Scene {
  let sel = 0, pos = 0, t = 0;
  return {
    enter(p?: { loc?: number }) { sel = clamp(p?.loc ?? Math.min(save.loc, unlockedLoc()), 0, LOCS.length - 1); pos = sel; save.loc = sel; t = 0; startMusic('menu'); },
    update(dt) { t += dt; pos += (sel - pos) * Math.min(1, dt * 11); },
    draw(ctx) {
      menuBg(ctx, 'dark'); topBar(ctx, X0(), X1());
      const L = LOCS[sel], open = sel <= unlockedLoc(), boss = charById(L.boss);
      const panelW = clamp(view.w * 0.31, 112, 156), availW = Math.round(view.w - panelW - 62 - X0() - view.sr), chh = Math.min(104, Math.round(availW * 0.58)), cw = Math.round(chh / 0.58), cx0 = X0() + 30 + Math.round((availW - cw) / 2), cy = 52;
      header(ctx, 'SELECT VENUE', cx0 + cw / 2, 22, 140);
      // carousel of cards (clipped so neighbours never run into the info panel)
      ctx.save(); ctx.beginPath(); ctx.rect(X0(), 28, cx0 + cw + 10 - X0(), chh + 34); ctx.clip();
      for (let i = Math.max(0, Math.floor(pos) - 1); i <= Math.min(LOCS.length - 1, Math.ceil(pos) + 1); i++) {
        const d = i - pos, x = Math.round(cx0 + d * (cw + 24)), y = cy + Math.sin(t * 2 + i) * 1.6, lk = i > unlockedLoc(); if (x > X1() || x + cw < X0()) continue;
        ctx.save(); neonFrame(ctx, x, y, cw, chh, lk ? '#65523f' : LOCS[i].accent, 7, i === sel ? 16 : 4); clipRR(ctx, x, y, cw, chh, 7); ctx.drawImage(hallArt(i, cw, chh), x, y);
        const sh = ctx.createLinearGradient(0, y + chh * 0.6, 0, y + chh); sh.addColorStop(0, 'rgba(11,7,3,0)'); sh.addColorStop(1, 'rgba(11,7,3,0.7)'); ctx.fillStyle = sh; ctx.fillRect(x, y, cw, chh);
        if (lk) { ctx.fillStyle = 'rgba(13,8,3,0.72)'; ctx.fillRect(x, y, cw, chh); icon(ctx, 'lock', x + cw / 2, y + chh / 2, { center: true }); }
        ctx.restore(); ctx.restore();
      }
      ctx.restore();
      // name under the card
      const ny = cy + chh + 7; const tc = textCanvas(L.name, { scale: 1.4, bold: true, slant: 0.15, color: '#ffffff', color2: '#fae3cd', outline: '#2c1a08', shadow: '#000000' }); ctx.drawImage(tc, Math.round(cx0 + cw / 2 - tc.width / 2), ny);
      text(ctx, open ? L.tag : `CLEAR ${LOCS[Math.max(0, sel - 1)].name} FIRST`, cx0 + cw / 2, ny + 20, { align: 'c', color: open ? '#f2dac3' : '#ff9aa8', outline: '#2c1a08' });
      // info panel
      const px = cx0 + cw + 16, pw = X1() - 6 - px, py = 24, ph = CB() - py; panel(ctx, px, py, pw, ph, { fill: '#2c1b09', line: open ? L.accent : '#65523f' });
      const mid = px + pw / 2; ctx.drawImage(avatar(L.boss, 38, 'normal', open ? L.accent : '#65523f'), Math.round(mid - 19), py + 6);
      text(ctx, 'BOSS', mid, py + 46, { align: 'c', color: '#c0af9e', outline: null }); text(ctx, boss.name, mid, py + 57, { align: 'c', bold: true, color: '#ffffff', outline: '#2c1a08', scale: textWidth(boss.name, { bold: true }) > pw - 10 ? 0.8 : 1 });
      text(ctx, boss.title, mid, py + 70, { align: 'c', color: '#ffd23a', outline: '#3a2000' });
      const won = gamesWon(sel); for (let i = 0; i < 4; i++) { const x = mid - 34 + i * 18; fillRR(ctx, x, py + 86, 15, 15, '#120b04', 3); fillRR(ctx, x + 1, py + 87, 13, 13, i < won ? '#d7914b' : '#362412', 2.4); if (i < won) ctx.drawImage(iconCanvas('tick'), x + 0.5, py + 87.5); }
      text(ctx, open ? (won >= 4 ? 'VENUE CLEARED' : `${won} / 4 GAMES`) : 'LOCKED', mid, py + 104, { align: 'c', color: open ? '#ffffff' : '#ff9aa8', outline: '#2c1a08' });
      const pw2 = powerById(L.reward); ctx.drawImage(powerIcon(pw2, 22), px + 8, py + 118); text(ctx, 'CLEAR BONUS', px + 34, py + 118, { color: '#c0af9e', outline: null }); text(ctx, `+5 ${pw2.name}`, px + 34, py + 129, { color: '#ffe27a', outline: '#3a2000', scale: textWidth(`+5 ${pw2.name}`) > pw - 40 ? 0.82 : 1 });
      const d = arrows(ctx, X0() + 14, cx0 + cw + 2, cy + chh / 2, sel > 0, sel < LOCS.length - 1, 11); if (d) { sel += d; save.loc = sel; sfx('tick'); }
      if (ptr.swipe) { const n = clamp(sel + ptr.swipe, 0, LOCS.length - 1); if (n !== sel) { sel = n; save.loc = sel; sfx('tick'); } }
      for (let i = 0; i < LOCS.length; i++) fillRR(ctx, cx0 + cw / 2 - LOCS.length * 4.5 + i * 9, CB() + 4, 6, 3, i === sel ? '#ffffff' : i > unlockedLoc() ? '#45321f' : '#d7914b', 1);
      if (backBtn(ctx)) go('hub'); if (okBtn(ctx, 'CONTINUE', { disabled: !open })) { persist(); go('hall', { loc: sel }); }
    },
    back() { go('hub'); return true; },
  };
}

/* ============================================================ HALL: the four games against the boss */
const GAME_NAMES = (loc: number, g: number): GameId => careerGame(loc, g);
export function makeHall(): Scene {
  let loc = 0, sel = 0, t = 0, msg = '';
  const canPlay = (g: number) => g === 0 || gameWon(loc, g - 1) || gameWon(loc, g);
  const play = () => {
    if (!canPlay(sel)) return; const L = LOCS[loc], mode = GAME_NAMES(loc, sel);
    const cfg: PlayCfg = { mode, loc, player: save.char, opp: L.boss, kind: 'career', bet: 0, title: L.name, career: { loc, game: sel }, skillBoost: [-0.14, -0.09, -0.04, 0][sel] ?? 0, breaker: 0 };
    go('loading', cfg);
  };
  return {
    enter(p?: { loc?: number; won?: boolean }) { loc = p?.loc ?? save.loc; save.loc = loc; sel = Math.min(3, nextGame(loc)); t = 0; msg = ''; startMusic('menu'); },
    update(dt) { t += dt; },
    draw(ctx) {
      const L = LOCS[loc]; ctx.drawImage(hallArt(loc, view.w, view.h), 0, 0); ctx.fillStyle = 'rgba(16,9,3,0.8)'; ctx.fillRect(0, 0, view.w, view.h);
      topBar(ctx, X0(), X1()); header(ctx, L.name, CX(), 24, Math.max(150, textWidth(L.name, { bold: true }) + 40));
      const lx = X0() + 8, lw = Math.min(150, view.w * 0.38), top = 56, gap = 4, rowH = Math.floor((CB() - top - 3 * gap) / 4);
      for (let g = 0; g < 4; g++) {
        const y = top + g * (rowH + gap), mode = modeById(GAME_NAMES(loc, g)), on = g === sel, ok = canPlay(g), won = gameWon(loc, g), col = on ? '#f2bd87' : ok ? '#c7893b' : '#55432f';
        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = on ? 12 : 3; fillRRr(ctx, lx - 1.5, y - 1.5, lw + 3, rowH + 3, col, 8.3); ctx.restore(); const gr = ctx.createLinearGradient(0, y, 0, y + rowH); gr.addColorStop(0, on ? '#613d18' : '#2c1b0a'); gr.addColorStop(1, on ? '#3c250d' : '#191006'); fillRR(ctx, lx, y, lw, rowH, gr, 4);
        ctx.save(); ctx.globalAlpha = ok ? 1 : 0.5; modeBadge(ctx, mode.id, lx + 15, y + rowH / 2, 8); ctx.restore();
        const tg = g === 3 ? 'SPECIAL' : mode.tag, avail = lw - 28 - 24; text(ctx, mode.name, lx + 28, y + 6, { bold: true, scale: fit(mode.name, avail, { bold: true }, 1), color: ok ? '#ffffff' : '#7a9488', outline: '#2c1a08' }); text(ctx, tg, lx + 28, y + 19, { scale: fit(tg, avail, {}, 1), color: ok ? '#f2dac3' : '#71675d', outline: null });
        if (!ok) icon(ctx, 'lock', lx + lw - 13, y + rowH / 2, { center: true }); else if (won) ctx.drawImage(iconCanvas('tick'), lx + lw - 20, y + rowH / 2 - 7);
        if (hit(lx, y, lw, rowH, true).click) { sel = g; sfx(ok ? 'click' : 'error'); }
      }
      // right: bracketed preview panel
      const px = lx + lw + 14, pw = X1() - 8 - px, py = 56, ph = CB() - 56, mode = modeById(GAME_NAMES(loc, sel));
      const br = (x: number, y: number, dx: number, dy: number) => { ctx.strokeStyle = '#c7893b'; ctx.lineWidth = 2; ctx.shadowColor = '#c7893b'; ctx.shadowBlur = 6; ctx.beginPath(); ctx.moveTo(x + dx * 8, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * 8); ctx.stroke(); ctx.shadowBlur = 0; };
      ctx.fillStyle = 'rgba(22,13,4,0.72)'; ctx.fillRect(px, py, pw, ph); br(px, py, 1, 1); br(px + pw, py, -1, 1); br(px, py + ph, 1, -1); br(px + pw, py + ph, -1, -1);
      const mid = px + pw / 2; text(ctx, mode.name, mid, py + 6, { align: 'c', scale: fit(mode.name, pw - 16, { bold: true }, 1.1), bold: true, color: '#ffe27a', outline: '#3a2000' }); text(ctx, mode.tag, mid, py + 19, { align: 'c', scale: fit(mode.tag, pw - 16), color: '#f2dac3', outline: '#2c1a08' });
      const rowY = py + 33, bsz = 46; miniRack(ctx, mode.id, px + 10 + bsz / 2 + 4, rowY + bsz / 2 + 4, bsz, L.board.frame, L.board.surface);
      const rx0 = px + 22 + bsz + 6, rw0 = px + pw - 8 - rx0, boss = charById(L.boss);
      ctx.drawImage(avatar(L.boss, 26, 'normal', L.accent), Math.round(rx0 + rw0 / 2 - 13), rowY); text(ctx, 'VS', rx0 + rw0 / 2, rowY + 29, { align: 'c', color: '#c0af9e', outline: null }); text(ctx, boss.name, rx0 + rw0 / 2, rowY + 39, { align: 'c', color: '#ffffff', outline: '#2c1a08', scale: fit(boss.name, rw0) });
      const dy0 = rowY + bsz + 12; wrap(mode.short, pw - 16).slice(0, Math.max(1, Math.floor((py + ph - 4 - dy0) / 9.5))).forEach((ln, i) => text(ctx, ln, px + 8, dy0 + i * 9.5, { color: '#ffffff', outline: '#2c1a08' }));
      if (msg) text(ctx, msg, mid, py + ph - 36, { align: 'c', color: '#ff9aa8', outline: '#2c1a08' });
      if (backBtn(ctx)) go('map', { loc }); const ok = canPlay(sel); if (okBtn(ctx, ok ? 'PLAY' : 'LOCKED', { disabled: !ok, icon: 'play' })) play();
      if (!ok) { msg = 'BEAT THE GAME BEFORE FIRST'; }
    },
    back() { go('map', { loc }); return true; },
  };
}
void Y0; void capsule; void titleBlock; void shade; void alpha; void COL;
