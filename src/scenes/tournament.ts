/* Tournament: 16 players, single knockout shown as a two sided bracket (R16, QF, SF to the final in the middle). The player's own matches are played for real, the
   rest are simulated from the players' skill. Rounds: US 8-Ball, 9-Ball, UK 8-Ball, then the final in US 8-Ball. */
import type { Scene } from './manager.js';
import { go } from './manager.js';
import { view, X0, X1, CX } from '../config.js';
import { save, persist, addCoins, unlockedLoc } from '../save.js';
import { PLAYABLE, charById, shortName } from '../data/characters.js';
import { modeById, type GameId } from '../data/modes.js';
import { LOCS } from '../data/locations.js';
import { avatar } from '../gfx/portrait.js';
import { text, textCanvas } from '../gfx/font.js';
import { menuBg, header, panel, capsule, icon, fillRR, COL } from '../gfx/ui.js';
import { topBar } from '../gfx/hud.js';
import { sfx, startMusic } from '../audio.js';
import { backBtn } from './common.js';
import type { SelectParams } from './select.js';
import type { PlayCfg } from '../game/finish.js';
import { rng, fmt } from '../util.js';

const NAMES = ['ROUND OF 16', 'QUARTER FINAL', 'SEMI FINAL', 'FINAL'], MODES_BY_ROUND: GameId[] = ['classic', 'free', 'duel', 'classic'], FEE = 200, PRIZE = 3000;
interface TState { player: string; seeds: string[]; winners: string[][]; r: number; over: boolean; champion: boolean }
let T: TState | null = null;

const gauss = (r: () => number) => (r() + r() + r() + r() - 2) * 1.2;
function simulate(a: string, b: string, r: () => number): string {
  const sa = charById(a).skill, sb = charById(b).skill; let A = 0, B = 0;
  for (let i = 0; i < 6; i++) { A += 6 + 13 * sa + gauss(r) * 5; B += 6 + 13 * sb + gauss(r) * 5; }
  return A >= B ? a : b;
}
const pairs = (t: TState, r: number): [string, string][] => { const src = r === 0 ? t.seeds : t.winners[r - 1]; const out: [string, string][] = []; for (let k = 0; k < src.length; k += 2) out.push([src[k], src[k + 1]]); return out; };
function prepRound(t: TState) {
  const r = rng((Math.random() * 1e9) | 0), w: string[] = [];
  pairs(t, t.r).forEach(([a, b]) => { if (a === t.player || b === t.player) w.push(''); else w.push(simulate(a, b, r)); });
  t.winners[t.r] = w;
}
const playerPair = (t: TState): [string, string] => pairs(t, t.r).find(([a, b]) => a === t.player || b === t.player)!;
const playerIdx = (t: TState) => pairs(t, t.r).findIndex(([a, b]) => a === t.player || b === t.player);
function finishAll(t: TState) {
  const r = rng((Math.random() * 1e9) | 0);
  for (let rd = t.r; rd < 4; rd++) { const ps = pairs(t, rd), w = t.winners[rd] ?? []; ps.forEach(([a, b], k) => { if (!w[k]) w[k] = simulate(a, b, r); }); t.winners[rd] = w; }
}
function startNew(player: string) {
  const r = rng((Math.random() * 1e9) | 0), ids = PLAYABLE.map((c) => c.id).filter((i) => i !== player); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const seeds = [player, ...ids.slice(0, 15)]; for (let i = seeds.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [seeds[i], seeds[j]] = [seeds[j], seeds[i]]; }
  T = { player, seeds, winners: [], r: 0, over: false, champion: false }; prepRound(T);
}

export function makeTournament(): Scene {
  let t = 0, pick = save.char;
  const choose = () => go('select', { title: 'SELECT PLAYER', ids: PLAYABLE.map((c) => c.id), start: pick, owned: (id: string) => save.chars.includes(id), onPick: (id: string) => go('tournament', { picked: id }), onBack: () => go('tournament', {}) } as SelectParams);
  return {
    enter(p?: { picked?: string; result?: boolean; forfeit?: boolean }) {
      t = 0; startMusic('menu'); if (p?.picked) pick = p.picked;
      if (T && (p?.result !== undefined || p?.forfeit)) {
        const won = !!p.result && !p.forfeit, k = playerIdx(T);
        if (won) {
          T.winners[T.r][k] = T.player; addCoins(100 * (T.r + 1)); T.r++; sfx('win');
          if (T.r >= 4) { T.over = true; T.champion = true; save.stats.trophies++; addCoins(PRIZE); persist(); sfx('level'); } else prepRound(T);
        } else { const [a, b] = playerPair(T); T.winners[T.r][k] = a === T.player ? b : a; finishAll(T); T.over = true; T.champion = false; }
      }
    },
    update(dt) { t += dt; },
    draw(ctx) {
      menuBg(ctx, 'teal'); topBar(ctx, X0(), X1()); header(ctx, !T ? 'TOURNAMENT' : T.over ? (T.champion ? 'CHAMPION' : 'KNOCKED OUT') : NAMES[Math.min(3, T.r)], CX(), 24, 150);
      if (!T) {
        const w = Math.min(300, view.w - 24), x = CX() - w / 2, y = 52, h = 126; panel(ctx, x, y, w, h, { fill: '#2c1b09' });
        ['16 PLAYERS, SINGLE KNOCKOUT', 'R16 CLASSIC   QF FREESTYLE', 'SF B&W DUEL   FINAL CLASSIC', `ENTRY FEE ${FEE} COINS`, `WIN THE TROPHY AND ${fmt(PRIZE)} COINS!`].forEach((s, i) => text(ctx, s, CX(), y + 10 + i * 13, { align: 'c', color: i === 4 ? '#ffd23a' : i === 3 ? '#ff9ae8' : '#ffffff', outline: '#2c1a08', bold: i === 0 }));
        ctx.drawImage(avatar(pick, 28, 'normal', '#f2bd87'), CX() - 14, y + h - 50); text(ctx, charById(pick).name, CX(), y + h - 19, { align: 'c', color: '#ffffff', outline: '#2c1a08' });
        const cyb = y + h + 5; if (capsule(ctx, 'CHANGE PLAYER', CX() - 66, cyb, 118, 18, 'teal')) choose();
        const can = save.coins >= FEE; if (capsule(ctx, can ? `ENTER  ${FEE}` : `NEED ${FEE} COINS`, CX() + 66, cyb, 118, 18, can ? 'gold' : 'grey', { disabled: !can })) { addCoins(-FEE); startNew(pick); sfx('buy'); }
        text(ctx, `TROPHIES WON: ${save.stats.trophies}`, x + w - 12, y + h - 20, { align: 'r', color: '#ffd23a', outline: '#3a2000' });
        if (backBtn(ctx)) go('title'); return;
      }
      const st = T, top = 50, bot = view.h - view.sb - 56, H2 = bot - top, x0 = X0() + 8, W2 = X1() - X0() - 16, cwid = W2 / 7, av = Math.min(17, H2 / 8 - 2);
      const colX = (j: number, right: boolean) => right ? x0 + W2 - (j + 0.5) * cwid : x0 + (j + 0.5) * cwid;
      const slotY = (j: number, i: number) => top + ((i + 0.5) * H2) / (8 >> j);
      const part = (j: number): string[] => (j === 0 ? st.seeds : st.winners[j - 1] ?? []);
      const next = !st.over ? playerPair(st) : null, opp = next ? (next[0] === st.player ? next[1] : next[0]) : '';
      ctx.strokeStyle = 'rgba(242,189,135,0.5)'; ctx.lineWidth = 1;
      for (let j = 0; j < 3; j++) for (const right of [false, true]) for (let i = 0; i < 8 >> j; i++) {
        const x = colX(j, right), nx = colX(j + 1, right), y = slotY(j, i), py = j === 2 ? (i === 0 ? CX() * 0 + top + H2 / 2 - 14 : top + H2 / 2 + 14) : slotY(j + 1, i >> 1), mx = (x + nx) / 2;
        ctx.beginPath(); ctx.moveTo(x + (right ? -av / 2 : av / 2), y); ctx.lineTo(mx, y); ctx.lineTo(mx, py); ctx.lineTo(nx + (right ? av / 2 : -av / 2), py); ctx.stroke();
      }
      for (let j = 0; j < 3; j++) for (const right of [false, true]) {
        const list = part(j), n = 8 >> j, base = right ? list.length / 2 : 0;
        for (let i = 0; i < n; i++) { const id = list[base + i] ?? '', x = colX(j, right), y = slotY(j, i), me = id === st.player, isOpp = id === opp && !st.over; if (id) ctx.drawImage(avatar(id, av, 'normal', me ? '#ffd23a' : isOpp ? '#ff8aa0' : '#f2bd87'), Math.round(x - av / 2), Math.round(y - av / 2)); else fillRR(ctx, x - av / 3, y - 2, av * 0.66, 4, '#523416', 2); }
      }
      // final slots + trophy in the middle
      const fin = part(3), mid = top + H2 / 2;
      [0, 1].forEach((i) => { const id = fin[i] ?? '', y = mid + (i ? 14 : -14), x = CX(); if (id) ctx.drawImage(avatar(id, av, 'normal', id === st.player ? '#ffd23a' : '#f2bd87'), Math.round(x - av / 2), Math.round(y - av / 2)); else fillRR(ctx, x - av / 3, y - 2, av * 0.66, 4, '#523416', 2); });
      const champ = st.winners[3]?.[0]; if (st.over && champ) { ctx.drawImage(avatar(champ, av + 4, 'cheer', '#ffd23a'), Math.round(CX() - (av + 4) / 2), Math.round(mid - 40)); }
      icon(ctx, 'trophy', CX(), mid, { center: true });
      // footer
      const fx = X0() + 84, fw = X1() - X0() - 168, fy = view.h - view.sb - 46;
      if (!st.over && next) {
        panel(ctx, fx, fy, fw, 38, { fill: '#2c1b09' }); ctx.drawImage(avatar(st.player, 26, 'normal', '#ffd23a'), fx + 6, fy + 6); ctx.drawImage(avatar(opp, 26, 'normal', '#ff8aa0'), fx + fw - 32, fy + 6);
        text(ctx, shortName(charById(st.player)), fx + 36, fy + 8, { color: '#ffd23a', outline: '#2c1a08' }); text(ctx, shortName(charById(opp)), fx + fw - 36, fy + 8, { align: 'r', color: '#ffb0bc', outline: '#2c1a08' });
        text(ctx, modeById(MODES_BY_ROUND[st.r]).name, CX(), fy + 24, { align: 'c', color: '#f2dac3', outline: null });
        if (capsule(ctx, 'PLAY', CX(), fy + 6, 66, 16, 'green')) {
          const cfg: PlayCfg = { mode: MODES_BY_ROUND[st.r], loc: Math.min(unlockedLoc(), 2 + st.r), player: st.player, opp, kind: 'tournament', round: st.r, bet: 0, title: NAMES[st.r], skillBoost: st.r * 0.03 - 0.04 };
          go('loading', cfg);
        }
      } else {
        panel(ctx, fx, fy, fw, 38, { fill: st.champion ? '#4a4a08' : '#4a0a1a', line: st.champion ? '#ffd23a' : '#ff6a8a' });
        const tc = textCanvas(st.champion ? 'CHAMPION!' : 'ELIMINATED', { scale: 1.4, bold: true, slant: 0.2, color: '#ffffff', color2: st.champion ? '#ffd23a' : '#ff9aa8', outline: '#2c1a08', shadow: '#000000' }); ctx.drawImage(tc, Math.round(CX() - tc.width / 2), fy + 4);
        text(ctx, st.champion ? `TROPHY WON  +${fmt(PRIZE)} COINS` : `CHAMPION: ${charById(champ ?? st.seeds[0]).name}`, CX(), fy + 24, { align: 'c', color: '#ffffff', outline: '#2c1a08' });
        if (capsule(ctx, 'NEW', X1() - 40, view.h - view.sb - 34, 56, 18, 'gold')) T = null;
      }
      if (backBtn(ctx)) { if (st.over) T = null; go('title'); }
      void COL; void LOCS;
    },
    back() { if (T?.over) T = null; go('title'); return true; },
  };
}
