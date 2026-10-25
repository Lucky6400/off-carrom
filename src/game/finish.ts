/* End of a match: turns the game's numbers into the XP / coin rows of the result screen and applies them to the save. */
import type { GameId } from '../data/modes.js';
import { LOCS } from '../data/locations.js';
import { xpForLevel, type PowerId } from '../data/items.js';
import { save, persist, addCoins, addXp, addPower, setGameWon, gameWon, locDone } from '../save.js';
import type { Game } from './rules.js';

export interface PlayCfg {
  mode: GameId; loc: number; player: string; opp: string; kind: 'career' | 'quick' | 'tournament' | 'tutorial'; bet: number; title: string;
  career?: { loc: number; game: number }; round?: number; skillBoost?: number; breaker?: 0 | 1; auto?: boolean;
}
export interface Row { label: string; xp: number; coins: number }
export interface Summary {
  cfg: PlayCfg; win: boolean; reason: string; rows: Row[]; xp: number; coins: number; levelBefore: number; xpBefore: number; xpNextBefore: number; levelAfter: number; xpAfter: number; xpNext: number;
  pots: number; streak: number; stageClear: boolean; locClear: boolean; reward: { id: PowerId; n: number } | null; unlockedLoc: number; scores: [number, number]; fouls: number;
}

export function finishMatch(cfg: PlayCfg, game: Game): Summary {
  const me = game.players[0], win = game.winner === 0, rows: Row[] = [], loc = cfg.loc;
  const pots = me.pots, streak = me.bestStreak;
  rows.push({ label: 'COINS POTTED', xp: Math.min(100, pots * 8), coins: pots * 14 });
  if (streak >= 2) rows.push({ label: 'STREAK BONUS', xp: Math.min(160, streak * 20), coins: streak * 12 });
  if (win) rows.push({ label: 'GAME WIN BONUS', xp: 200 + 20 * loc, coins: 50 + 12 * loc });
  if (cfg.bet > 0) rows.push({ label: win ? 'BET WON' : 'BET LOST', xp: 0, coins: win ? cfg.bet * 2 : 0 });
  let stageClear = false, locClear = false, reward: Summary['reward'] = null;
  const lvBefore = save.level, xpBefore = save.xp, xpNextBefore = xpForLevel(save.level);
  if (cfg.kind === 'career' && cfg.career && win) {
    const { loc: cl, game: cg } = cfg.career;
    if (!gameWon(cl, cg)) {
      const wasDone = locDone(cl); setGameWon(cl, cg); stageClear = true;
      rows.push({ label: 'FIRST CLEAR', xp: 120 + 30 * cl, coins: 100 + 60 * cl });
      if (!wasDone && locDone(cl) && !save.claimed[cl]) { locClear = true; save.claimed[cl] = true; const id = LOCS[cl].reward; reward = { id, n: 5 }; addPower(id, 5); rows.push({ label: 'VENUE CLEARED', xp: 300 + 80 * cl, coins: 500 + 250 * cl }); }
    }
  }
  const xp = rows.reduce((a, r) => a + r.xp, 0), coins = rows.reduce((a, r) => a + r.coins, 0);
  addCoins(coins); addXp(xp);
  const st = save.stats; st.games++; if (win) st.wins++; st.pots += pots; st.bestStreak = Math.max(st.bestStreak, streak); st.scratches += me.fouls; st.played[cfg.mode] = (st.played[cfg.mode] ?? 0) + 1;
  persist();
  let unl = 0; for (let i = 0; i < LOCS.length - 1; i++) { if (locDone(i)) unl = i + 1; else break; }
  return { cfg, win, reason: game.reason, rows, xp, coins, levelBefore: lvBefore, xpBefore, xpNextBefore, levelAfter: save.level, xpAfter: save.xp, xpNext: xpForLevel(save.level), pots, streak, stageClear, locClear, reward, unlockedLoc: unl, scores: [game.players[0].score, game.players[1].score], fouls: me.fouls };
}
