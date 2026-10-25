/* Quick match: pick your player, the opponent (character select), then the setup screen: game type, table (unlocked halls) and an optional bet. */
import type { Scene } from './manager.js';
import { go } from './manager.js';
import { view, X0, X1, CX } from '../config.js';
import { save, addCoins, hallOpen, unlockedLoc } from '../save.js';
import { PLAYABLE, CHARS, charById, shortName } from '../data/characters.js';
import { LOCS } from '../data/locations.js';
import { MODES, type GameId } from '../data/modes.js';
import { hallArt } from '../gfx/halls.js';
import { modeBadge } from '../gfx/coins.js';
import { avatar } from '../gfx/portrait.js';
import { text, textWidth, wrap } from '../gfx/font.js';
import { menuBg, header, fillRR, fillRRr, icon, capsule, panel, hit, COL, fit } from '../gfx/ui.js';
import { topBar } from '../gfx/hud.js';
import { sfx, startMusic } from '../audio.js';
import { backBtn, okBtn, arrows, neonFrame, clipRR } from './common.js';
import type { SelectParams } from './select.js';
import type { PlayCfg } from '../game/finish.js';
import { fmt, clamp } from '../util.js';

const BETS = [0, 50, 100, 250, 500];
export interface QState { player: string; opp: string; mode: number; loc: number; bet: number }

/** go straight to the player select (no scene in between) */
export function startQuick(p?: Partial<QState>) {
      const st: QState = { player: save.char, opp: 'babulal', mode: 0, loc: Math.min(save.loc, unlockedLoc()), bet: 0, ...(p ?? {}) };
      const pickOpp = () => go('select', { title: 'SELECT OPPONENT', ids: CHARS.filter((c) => c.playable).map((c) => c.id), start: st.opp, exclude: st.player, onPick: (id: string) => go('setup', { ...st, opp: id }), onBack: pickPlayer } as SelectParams);
      function pickPlayer() { go('select', { title: 'SELECT PLAYER', ids: PLAYABLE.map((c) => c.id), start: st.player, owned: (id: string) => save.chars.includes(id), onPick: (id: string) => { st.player = id; if (st.opp === id) st.opp = PLAYABLE.find((c) => c.id !== id)!.id; pickOpp(); }, onBack: () => go('title') } as SelectParams); }
      pickPlayer();
}
/** only used by the #quick debug hash */
export function makeQuick(): Scene { return { enter(p?: Partial<QState>) { startQuick(p); }, draw(ctx) { menuBg(ctx, 'green'); } }; }

export function makeSetup(): Scene {
  let S: QState = { player: 'arjun', opp: 'babulal', mode: 0, loc: 0, bet: 0 }, t = 0, msg = 0, off = 0;
  const start = () => {
    const m = MODES[S.mode], bet = S.bet; if (bet > save.coins) { sfx('error'); msg = 1.5; return; } if (bet) addCoins(-bet);
    const cfg: PlayCfg = { mode: m.id, loc: S.loc, player: S.player, opp: S.opp, kind: 'quick', bet, title: m.name, breaker: Math.random() < 0.5 ? 0 : 1 };
    go('loading', cfg);
  };
  return {
    enter(p: QState) { S = { ...p, loc: hallOpen(p.loc) ? p.loc : 0 }; t = 0; msg = 0; off = 0; startMusic('menu'); },
    update(dt) { t += dt; msg -= dt; off *= Math.pow(0.001, dt); },
    draw(ctx) {
      menuBg(ctx, 'teal'); topBar(ctx, X0(), X1(), 4, { profile: false });
      // players
      ctx.drawImage(avatar(S.player, 26, 'normal', '#f2bd87'), X0() + 8, 22); text(ctx, shortName(charById(S.player)), X0() + 38, 31, { color: '#ffffff', outline: '#2c1a08', bold: true });
      ctx.drawImage(avatar(S.opp, 26, 'normal', '#ff8aa0'), X1() - 34, 22); text(ctx, shortName(charById(S.opp)), X1() - 38, 31, { align: 'r', color: '#ffb0bc', outline: '#2c1a08', bold: true });
      header(ctx, 'GAME SETUP', CX(), 22, 130);
      // game types: grid of mini cards
      const gx = X0() + 8, gy = 52, gw = Math.min(84, (view.w * 0.46 - 14) / 2), gh = 22, g = 3;
      MODES.forEach((m, i) => {
        const x = gx + (i % 2) * (gw + g), y = gy + Math.floor(i / 2) * (gh + g), on = i === S.mode;
        ctx.save(); ctx.shadowColor = on ? '#edc65c' : '#c7893b'; ctx.shadowBlur = on ? 10 : 2; fillRRr(ctx, x - 1.5, y - 1.5, gw + 3, gh + 3, on ? '#edca5c' : '#805c34', 8.3); ctx.restore();
        const gr = ctx.createLinearGradient(0, y, 0, y + gh); gr.addColorStop(0, on ? '#613d18' : '#2c1b0a'); gr.addColorStop(1, on ? '#3c250d' : '#191006'); fillRR(ctx, x, y, gw, gh, gr, 4);
        modeBadge(ctx, m.id, x + 11, y + gh / 2, 6.5); text(ctx, m.name, x + 22, y + 3, { bold: true, scale: fit(m.name, gw - 26, { bold: true }, 1), color: '#ffffff', outline: '#2c1a08' }); text(ctx, m.special ? 'SPECIAL' : 'CLASSIC', x + 22, y + 12.5, { scale: 0.82, color: m.special ? '#ffe27a' : '#f2dac3', outline: null });
        if (hit(x, y, gw, gh, true).click) { S.mode = i; sfx('click'); }
      });
      const m = MODES[S.mode], dy = gy + 5 * (gh + g) + 3; wrap(m.desc, gw * 2 + g).slice(0, 2).forEach((ln, i) => text(ctx, ln, gx, dy + i * 9.5, { color: '#fbecdc', outline: '#2c1a08', scale: 0.92 }));
      // table / hall card with arrows
      const rx = gx + gw * 2 + g + 24, rw = X1() - 10 - rx, chh = Math.min(86, Math.round(rw * 0.6)), cw = Math.round(chh / 0.6), cx = rx + Math.round((rw - cw) / 2), cy = 50, L = LOCS[S.loc], open = hallOpen(S.loc);
      ctx.save(); neonFrame(ctx, cx, cy, cw, chh, open ? L.accent : '#65523f', 6, 12); clipRR(ctx, cx, cy, cw, chh, 6); ctx.drawImage(hallArt(S.loc, cw, chh), cx, cy);
      if (!open) { ctx.fillStyle = 'rgba(13,8,3,0.72)'; ctx.fillRect(cx, cy, cw, chh); icon(ctx, 'lock', cx + cw / 2, cy + chh / 2, { center: true }); } ctx.restore(); ctx.restore();
      text(ctx, L.name, cx + cw / 2, cy + chh + 4, { align: 'c', bold: true, scale: fit(L.name, rw, { bold: true }, 1), color: '#ffffff', outline: '#2c1a08' }); text(ctx, open ? `${L.board.frameKind.toUpperCase()} BOARD` : 'CLEAR THE PREVIOUS VENUE', cx + cw / 2, cy + chh + 16, { align: 'c', color: open ? '#f2dac3' : '#ff9aa8', outline: null });
      const d = arrows(ctx, Math.max(X0() + 12, cx - 12), Math.min(X1() - 12, cx + cw + 12), cy + chh / 2, S.loc > 0, S.loc < LOCS.length - 1, 10); if (d) { S.loc += d; off = d * 20; sfx('tick'); }
      // bet
      const by = cy + chh + 32; text(ctx, 'BET', cx, by, { color: '#ffe27a', outline: '#3a2000', bold: true }); text(ctx, S.bet ? `WIN ${fmt(S.bet * 2)} COINS` : 'JUST FOR FUN', cx + cw, by, { align: 'r', color: '#ffd23a', outline: '#3a2000' });
      const bw = (cw + 2) / BETS.length;
      BETS.forEach((b, i) => { const x = cx + i * bw, ok = b <= save.coins, on = S.bet === b; if (capsule(ctx, b ? String(b) : 'NONE', x + bw / 2 - 1, by + 10, bw - 3, 15, on ? 'gold' : ok ? 'green' : 'grey', { disabled: !ok, scale: 0.82 })) S.bet = b; });
      if (msg > 0) text(ctx, 'NOT ENOUGH COINS', CX(), view.h - 52, { align: 'c', color: '#ff8a9a', outline: '#2a0010', bold: true, alpha: clamp(msg * 2, 0, 1) });
      if (backBtn(ctx)) startQuick({ ...S }); if (okBtn(ctx, 'PLAY', { disabled: !open, icon: 'play' })) start();
    },
    back() { startQuick({ ...S }); return true; },
  };
}
void COL; void panel;
