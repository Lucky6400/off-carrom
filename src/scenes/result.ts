/* Result screen after every match (the reference's "RESULTS"): the table dimmed behind, rows of XP and coins counting up, total earned, level bar,
   and extras (stage cleared, hall cleared with 5 power-ups, next hall unlocked, level up). Tap to skip the count, use the CONTINUE button to leave. */
import type { Scene } from './manager.js';
import { go } from './manager.js';
import { view, X0, X1, CX } from '../config.js';
import { ptr } from '../input.js';
import type { Summary } from '../game/finish.js';
import { lastFrame } from '../gfx/snap.js';
import { menuBg, panel, fillRR, icon, header, capsule, COL, alpha } from '../gfx/ui.js';
import { text, textWidth, textCanvas } from '../gfx/font.js';
import { sfx, startMusic } from '../audio.js';
import { LOCS } from '../data/locations.js';
import { STRIKERS, GRIPS, POWDERS, powerById } from '../data/items.js';
import { powerIcon } from '../gfx/gearfx.js';
import { avatar } from '../gfx/portrait.js';
import { clamp, fmt } from '../util.js';
import { CB } from './common.js';
import { save, addCoins } from '../save.js';
import { adBreak, adFailText, adReady, showRewarded } from '../admob.js';

export function makeResult(): Scene {
  let s!: Summary, t = 0, shown = 0, rowT = 0, done = false, lvT = 0, popped = false, leaving = false, adBusy = false, doubled = false, adMsg = '', adMsgT = 0;
  const ROW = 0.34;
  const unlocks = (lv: number) => [...STRIKERS.filter((c) => c.level === lv && c.price > 0).map((c) => c.name), ...GRIPS.filter((c) => c.level === lv && c.price > 0).map((c) => c.name), ...POWDERS.filter((c) => c.level === lv && c.price > 0).map((c) => c.name)];
  /* every 3rd time the player leaves the result screen an interstitial plays first (never waits for a missing ad) */
  const afterAd = (fn: () => void) => { if (leaving || adBusy) return; leaving = true; void adBreak().then(() => { leaving = false; fn(); }); };
  const next = () => afterAd(() => {
    const c = s.cfg;
    if (c.kind === 'career') go('hall', { loc: c.career?.loc ?? c.loc, won: s.win });
    else if (c.kind === 'tournament') go('tournament', { result: s.win });
    else go('title');
  });
  const retry = () => afterAd(() => { const c = { ...s.cfg }; if (c.bet > 0) { if (save.coins >= c.bet) addCoins(-c.bet); else c.bet = 0; } go('loading', c); });
  /* rewarded: watch an ad to double the coins from this match */
  const doubleCoins = () => { if (adBusy || doubled || leaving) return; adBusy = true; adMsg = adReady() ? '' : 'LOADING AD...'; adMsgT = adMsg ? 8 : 0; void showRewarded().then((res) => { adBusy = false; if (res.completed) { addCoins(s.coins); doubled = true; adMsg = '+' + fmt(s.coins) + ' COINS!'; adMsgT = 3; sfx('level'); } else { adMsg = adFailText(res); adMsgT = 4; } }); };
  return {
    enter(sm: Summary) { s = sm; leaving = false; adBusy = false; doubled = false; adMsg = ''; adMsgT = 0; t = 0; shown = 0; rowT = 0; done = false; lvT = 0; popped = false; startMusic('result'); sfx(s.win ? 'win' : 'lose'); },
    update(dt) {
      t += dt; rowT += dt; if (adMsgT > 0) adMsgT -= dt; const n = s.rows.length + 2; // rows, total, level
      if (!done) { const k = Math.floor(rowT / ROW); if (k > shown) { shown = Math.min(n, k); sfx('tick'); } if (shown >= n) { done = true; lvT = 0; } }
      else { lvT += dt; if (s.levelAfter > s.levelBefore && !popped && lvT > 0.9) { popped = true; sfx('level'); } }
    },
    draw(ctx) {
      const snap = lastFrame(); if (snap) { ctx.drawImage(snap, 0, 0, view.w, view.h); ctx.fillStyle = 'rgba(13,7,1,0.62)'; ctx.fillRect(0, 0, view.w, view.h); } else menuBg(ctx, 'dark');
      const w = Math.min(view.w - 24, 340), x = Math.round(CX() - w / 2), rows = s.rows, RH = 12.5, hasGear = s.levelAfter > s.levelBefore && unlocks(s.levelAfter).length > 0, extra = s.reward ? 1 : s.locClear || s.stageClear ? 1 : 0;
      const contentH = 17 + rows.length * RH + 6 + 14 + 6 + 32 + (hasGear ? 10 : 0) + (extra ? 24 : 0) + 6, ph = Math.min(CB() - 34, contentH), py = 32 + Math.round((CB() + 2 - 32 - ph) / 2);
      header(ctx, 'RESULTS', CX(), 4, 130);
      text(ctx, s.win ? 'YOU WON' : 'YOU LOST', X0() + 10, 8, { bold: true, scale: 1.1, slant: 0.2, color: '#ffffff', color2: s.win ? '#ffe27a' : '#ffb0bc', outline: s.win ? '#5a3a00' : '#5a0a1a', shadow: '#000000' });
      text(ctx, s.reason, X1() - 10, 12, { align: 'r', color: '#f2dac3', outline: '#2c1a08' });
      panel(ctx, x, py, w, ph, { fill: '#2c1b09', line: s.win ? COL.gold : '#ff6a8a', alpha: 0.96 });
      const cx = x + w - 16, xx = cx - 82; text(ctx, 'XP', xx, py + 5, { align: 'r', color: '#c0af9e', outline: null }); text(ctx, 'COINS', cx, py + 5, { align: 'r', color: '#c0af9e', outline: null });
      let y = py + 17;
      rows.forEach((r, i) => {
        if (i >= shown) { y += RH; return; } const k = clamp(rowT / ROW - i, 0, 1), a = clamp(k * 2, 0, 1), cv = fmt(Math.round(r.coins * (done ? 1 : k)));
        ctx.save(); ctx.globalAlpha = a; text(ctx, r.label, x + 14, y, { color: '#ffffff', outline: '#2c1a08' });
        text(ctx, fmt(Math.round(r.xp * (done ? 1 : k))), xx, y, { align: 'r', color: '#f2dac3', outline: '#2c1a08' }); ctx.drawImage(coinImg(), cx - textWidth(cv) - 15.5, y - 1.8); text(ctx, cv, cx, y, { align: 'r', color: '#ffe27a', outline: '#3a2000' }); ctx.restore(); y += RH;
      });
      if (shown > rows.length) { fillRR(ctx, x + 10, y - 1, w - 20, 1.2, 'rgba(225,165,105,0.5)', 0.5); y += 4; const a = clamp(rowT / ROW - rows.length, 0, 1); ctx.save(); ctx.globalAlpha = a; text(ctx, 'TOTAL EARNED', x + 14, y, { color: '#ffffff', outline: '#2c1a08', bold: true }); text(ctx, fmt(s.xp), xx, y, { align: 'r', bold: true, color: '#ffffff', outline: '#2c1a08' }); text(ctx, fmt(s.coins), cx, y, { align: 'r', bold: true, color: '#ffd23a', outline: '#3a2000' }); ctx.restore(); }
      y += 14 + 6;
      if (shown > rows.length) {
        const lvUp = s.levelAfter > s.levelBefore, f0 = Math.min(1, s.xpBefore / s.xpNextBefore), f1 = s.xpAfter / s.xpNext, kk = done ? clamp(lvT / 0.8, 0, 1) : 0, f = lvUp ? (kk < 0.5 ? lerp0(f0, 1, kk * 2) : lerp0(0, f1, (kk - 0.5) * 2)) : lerp0(f0, f1, kk);
        const lv = lvUp && kk >= 0.5 ? s.levelAfter : s.levelBefore, bx = x + 14, bw = w - 28;
        text(ctx, `LEVEL ${lv}`, bx, y, { color: '#ffe27a', outline: '#3a2000', bold: true });
        fillRR(ctx, bx, y + 12, bw, 11, '#120b04', 3); fillRR(ctx, bx + 1, y + 13, Math.max(3, (bw - 2) * f), 9, '#d7914b', 2.4); fillRR(ctx, bx + 1, y + 13, Math.max(3, (bw - 2) * f), 3, 'rgba(255,255,255,0.4)', 1.2);
        const nn = lvUp && kk >= 0.5 ? s.xpNext : s.xpNextBefore; text(ctx, `${fmt(Math.round(f * nn))} / ${fmt(nn)}`, bx + bw / 2, y + 14.5, { align: 'c', color: '#ffffff', outline: '#2c1a08' });
        if (lvUp && kk >= 0.5) { const p = 0.5 + 0.5 * Math.sin(t * 8); text(ctx, 'LEVEL UP!', x + w - 14, y, { align: 'r', bold: true, color: '#ffffff', outline: '#6f4115', alpha: 0.7 + p * 0.3 }); if (hasGear) text(ctx, `NEW GEAR: ${unlocks(s.levelAfter).join(', ')}`, CX(), y + 28, { align: 'c', color: '#edca5c', outline: '#2c1a08' }); }
        y += 26 + (hasGear ? 10 : 0);
      }
      if (done && extra) { const yy = py + ph - 26; fillRR(ctx, x + 10, yy, w - 20, 21, 'rgba(255,210,70,0.16)', 4); if (s.reward) { const p = powerById(s.reward.id); ctx.drawImage(powerIcon(p, 19), x + 13, yy + 1); text(ctx, `VENUE CLEARED!  +${s.reward.n} ${p.name}`, x + 37, yy + 6.5, { color: '#ffe27a', outline: '#3a2000' }); } else text(ctx, s.locClear ? 'VENUE CLEARED!' : 'STAGE CLEARED!', CX(), yy + 6.5, { align: 'c', bold: true, color: '#edca5c', outline: '#2c1a08' }); }
      if (done) {
        const by = view.h - view.sb - 21;
        if (s.cfg.kind === 'quick' || (s.cfg.kind === 'career' && !s.win)) { if (capsule(ctx, 'RETRY', X0() + 52, by - 9, 78, 18, 'teal')) retry(); }
        if (s.coins > 0 && !doubled) { if (capsule(ctx, adBusy ? 'LOADING AD...' : 'WATCH AD: x2 COINS', CX(), by - 9, 118, 18, 'teal', { disabled: adBusy })) doubleCoins(); }
        if (adMsgT > 0) text(ctx, adMsg, CX(), by - 22, { align: 'c', bold: true, color: doubled ? '#ffe27a' : '#ffb07a', outline: '#2c1a08' });
        if (capsule(ctx, 'CONTINUE', X1() - 52, by - 9, 88, 18, 'green')) next();
      } else if (ptr.pressed) { shown = rows.length + 2; rowT = ROW * 99; done = true; lvT = 0; }
      void icon; void alpha; void avatar; void textCanvas;
    },
    back() { if (done) next(); return true; },
  };
}
const lerp0 = (a: number, b: number, t: number) => a + (b - a) * t;
import { iconCanvas } from '../gfx/ui.js';
const coinImg = () => iconCanvas('coin');
