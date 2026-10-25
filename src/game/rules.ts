/* Rule sets for the ten games: racks, who owns which coin, and the verdict after every shot (foul, keep the turn, cover the queen, win, respot ...).
   Pure logic: the play scene feeds it the physics' ShotLog and applies the verdict. Coin ids: 0 striker, 1..9 white, 10..18 black, 19 queen. */
import type { GameId } from '../data/modes.js';
import { CR, BASE_Y, newCoin, freeSpot, type Coin, type ShotLog, type Sim } from './physics.js';

export type Side = 'white' | 'black';
export const QUEEN = 19;
export const sideOf = (id: number): Side | 'queen' => (id === QUEEN ? 'queen' : id <= 9 ? 'white' : 'black');
export const coinValue = (id: number) => (id === QUEEN ? 50 : id <= 9 ? 20 : 10);
export const RAPID_TIME = 180, SHOT_CLOCK = 25, DUEL_CLOCK = 20, KNOCK_LIVES = 3;
export const TARGETS: Partial<Record<GameId, number>> = { free: 100, combo: 120, bank: 60, target: 19, sprint: 3 };
/** per shot clock (seconds) of a mode, 0 = none */
export const shotClockOf = (m: GameId) => (m === 'rapid' ? SHOT_CLOCK : m === 'duel' ? DUEL_CLOCK : 0);
export const isColored = (m: GameId) => m === 'classic' || m === 'duel' || m === 'queen';

export interface PlayerSt { idx: number; ai: boolean; side: Side | null; score: number; lives: number; pots: number; streak: number; bestStreak: number; fouls: number }
export interface Verdict {
  foul: string | null; keep: boolean; win: number; reason: string; potted: number[]; respot: number[]; reRack: boolean; nextTurn: number;
  points: number; lifeLost: boolean; pending: boolean; covered: boolean; msg: string; sub: string; tone: 'good' | 'bad' | 'info';
}

/* ---------------------------------------------------------------- racks */
/** the hexagonal lattice around the centre: ring 1 (6 coins), then ring 2 as 6 corners and 6 edges, sorted by angle */
function lattice() {
  const d = 2 * CR + 0.0006, ring1: [number, number][] = [], corners: [number, number][] = [], edges: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / 3; ring1.push([Math.cos(a) * d, Math.sin(a) * d]); corners.push([Math.cos(a) * 2 * d, Math.sin(a) * 2 * d]);
    const b = a + Math.PI / 6; edges.push([Math.cos(b) * d * Math.sqrt(3), Math.sin(b) * d * Math.sqrt(3)]);
  }
  const ring2: [number, number][] = []; for (let k = 0; k < 6; k++) { ring2.push(corners[k]); ring2.push(edges[k]); }
  return { ring1, ring2, corners, edges };
}
export function rackIds(g: GameId): number[] {
  switch (g) {
    case 'duel': return [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16];
    case 'queen': return [QUEEN, 1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15, 16].slice(0, 13);
    case 'sprint': return [QUEEN, 1, 2, 3, 10, 11, 12];
    case 'target': return [1, 2, 3, 4, 5, 6, 7, 8];
    default: return Array.from({ length: 19 }, (_, i) => i + 1);
  }
}
/** striker first, then the coins in their start positions */
export function rackCoins(g: GameId): Coin[] {
  const L = lattice(), out: Coin[] = [newCoin(0, 0, -BASE_Y)];
  const put = (id: number, p: [number, number]) => out.push(newCoin(id, p[0], p[1]));
  const white = (n: number) => n, black = (n: number) => 9 + n;
  switch (g) {
    case 'duel': {
      const pos = [...L.ring1, ...L.corners, L.edges[1], L.edges[4]];
      pos.forEach((p, i) => put(i % 2 === 0 ? white(1 + (i >> 1)) : black(1 + (i >> 1)), p)); break;
    }
    case 'queen': {
      put(QUEEN, [0, 0]); const pos = [...L.ring1, ...L.corners];
      pos.forEach((p, i) => put(i % 2 === 0 ? white(1 + (i >> 1)) : black(1 + (i >> 1)), p)); break;
    }
    case 'sprint': {
      put(QUEEN, [0, 0]); L.ring1.forEach((p, i) => put(i % 2 === 0 ? white(1 + (i >> 1)) : black(1 + (i >> 1)), p)); break;
    }
    case 'target': {
      const rr = 0.115; for (let i = 0; i < 8; i++) { const a = Math.PI / 2 + (i * Math.PI * 2) / 8; put(1 + i, [Math.cos(a) * rr, Math.sin(a) * rr]); } break;
    }
    default: {
      put(QUEEN, [0, 0]); let w = 0, b = 0;
      L.ring1.forEach((p, k) => { if (k % 2 === 0) put(white(++w), p); else put(black(++b), p); });
      L.ring2.forEach((p, j) => { if (j % 4 < 2) put(white(++w), p); else put(black(++b), p); });
    }
  }
  return out;
}
/** put a coin back on the centre spot (or the nearest free place around it) */
export function spotCoin(s: Sim, id: number) {
  const c = s.coins.find((x) => x.id === id); if (!c) return;
  c.state = 0; c.vx = c.vy = 0; c.pocket = -1; c.fallT = 0;
  const step = 2 * CR * 1.04;
  for (let ring = 0; ring < 7; ring++) {
    const n = ring === 0 ? 1 : ring * 6;
    for (let k = 0; k < n; k++) { const a = Math.PI / 2 + (k / n) * Math.PI * 2, x = Math.cos(a) * ring * step, y = Math.sin(a) * ring * step; if (freeSpot(s, x, y, CR, id)) { c.x = x; c.y = y; return; } }
  }
  c.x = 0; c.y = 0;
}

/* ---------------------------------------------------------------- the game */
export class Game {
  id: GameId; players: PlayerSt[]; turn = 0; over = false; winner = -1; reason = ''; down = new Set<number>(); ids: number[]; pendingCover = -1; queenBy = -1; suddenDeath = false;
  constructor(id: GameId, ai: [boolean, boolean], ids?: number[]) {
    this.id = id; this.ids = ids ?? rackIds(id);
    this.players = [0, 1].map((i) => ({ idx: i, ai: ai[i], side: isColored(id) ? (i === 0 ? 'white' : 'black') : null, score: 0, lives: KNOCK_LIVES, pots: 0, streak: 0, bestStreak: 0, fouls: 0 }));
  }
  clone(): Game { const g = new Game(this.id, [false, false], this.ids); g.players = this.players.map((p) => ({ ...p })); g.turn = this.turn; g.over = this.over; g.winner = this.winner; g.down = new Set(this.down); g.pendingCover = this.pendingCover; g.queenBy = this.queenBy; g.suddenDeath = this.suddenDeath; return g; }
  get cur() { return this.players[this.turn]; }
  get opp() { return this.players[1 - this.turn]; }
  colored() { return isColored(this.id); }
  live(): number[] { return this.ids.filter((i) => !this.down.has(i)); }
  /** a coin of this player's colour */
  mine(id: number, p = this.turn): boolean { return this.colored() && sideOf(id) === this.players[p].side; }
  liveOwn(p: number): number[] { return this.live().filter((i) => this.mine(i, p)); }
  /** coins the player on turn wants to pot (for the HUD and the AI's candidate list) */
  goals(): number[] {
    const live = this.live();
    if (this.id === 'target') return live.length ? [Math.min(...live)] : [];
    if (!this.colored()) return live;
    return live.filter((i) => i === QUEEN || this.mine(i));
  }
  /** apply the shot result; returns what happened (the scene shows it and applies respots / re-racks) */
  evaluate(sh: ShotLog, forced?: string): Verdict {
    const me = this.cur, opp = this.opp, ids = sh.pocketed.filter((p) => p.id !== 0).map((p) => p.id);
    const v: Verdict = { foul: null, keep: false, win: -1, reason: '', potted: ids, respot: [], reRack: false, nextTurn: this.turn, points: 0, lifeLost: false, pending: false, covered: false, msg: '', sub: '', tone: 'info' };
    let foul: string | null = forced ?? (sh.strikerPocketed ? 'STRIKER POTTED' : null);
    if (!foul && this.id === 'target' && sh.firstContact >= 0 && sh.firstContact !== Math.min(...this.live())) foul = 'WRONG COIN FIRST';
    v.foul = foul;
    const res: number[] = [], id = this.id;
    let unpend = false;
    if (this.colored()) {
      const gambit = id === 'queen', q = ids.includes(QUEEN), own = ids.filter((i) => i !== QUEEN && this.mine(i)), oth = ids.filter((i) => i !== QUEEN && !this.mine(i));
      const ownBefore = this.liveOwn(me.idx).length;
      if (foul) {
        res.push(...ids);
        if (this.pendingCover === me.idx) { res.push(QUEEN); unpend = true; }
        const myDown = this.ids.filter((i) => i !== QUEEN && this.down.has(i) && this.mine(i) && !res.includes(i)); if (myDown.length) res.push(myDown[myDown.length - 1]);
      } else {
        let cover = false;
        if (this.pendingCover === me.idx) { if (own.length) cover = true; else res.push(QUEEN); unpend = true; }
        if (q) { if (own.length || ownBefore === 0) cover = true; else { v.pending = true; } }
        if (gambit) res.push(...oth);
        if (cover) { v.covered = true; this.queenBy = me.idx; }
        v.keep = own.length > 0 || v.pending;
        // the last coin cannot win while the queen is still in play: it comes back
        const resolvedAfter = !this.ids.includes(QUEEN) || (this.queenBy >= 0 && !res.includes(QUEEN));
        if (!gambit && own.length && ownBefore - own.length === 0 && !resolvedAfter) { res.push(own[own.length - 1]); v.keep = true; v.sub = 'POT THE QUEEN FIRST'; }
      }
      this.commit(v, ids, res, unpend);
      me.pots += own.length - res.filter((i) => own.includes(i)).length; if (!gambit) opp.pots += oth.length;
      if (v.win < 0 && !foul) {
        if (gambit) { if (v.covered) { v.win = me.idx; v.reason = 'COVERED THE QUEEN'; } }
        else {
          const resolved = !this.ids.includes(QUEEN) || (this.queenBy >= 0 && this.down.has(QUEEN));
          for (const p of [me.idx, opp.idx]) if (resolved && this.liveOwn(p).length === 0) { v.win = p; v.reason = 'CLEARED ALL COINS'; break; }
        }
      }
    } else {
      const sc = this.scoreShot(v, sh, ids, foul, res); void sc;
      this.commit(v, ids, res, false);
    }
    if (v.win < 0) this.afterRules(v, me, opp, ids, foul);
    else this.finish(v);
    this.message(v, ids.length - res.filter((i) => ids.includes(i)).length);
    return v;
  }
  /** the modes where any coin scores */
  private scoreShot(v: Verdict, sh: ShotLog, ids: number[], foul: string | null, res: number[]) {
    const me = this.cur, opp = this.opp, id = this.id;
    switch (id) {
      case 'free': case 'rapid': {
        if (foul) { res.push(...ids); v.points = -Math.min(10, me.score); } else { v.points = ids.reduce((a, i) => a + coinValue(i), 0); v.keep = ids.length > 0; }
        break;
      }
      case 'combo': {
        if (foul) { res.push(...ids); v.points = -Math.min(20, me.score); } else { let st = me.streak; for (const i of ids) { st++; v.points += (i === QUEEN ? 30 : 10) * st; } v.keep = ids.length > 0; }
        break;
      }
      case 'knock': {
        if (foul) res.push(...ids); v.keep = !foul && ids.length > 0; v.lifeLost = !v.keep; break;
      }
      case 'bank': {
        const bank = sh.pocketed.filter((p) => p.id !== 0 && p.rim).map((p) => p.id), direct = ids.filter((i) => !bank.includes(i));
        if (foul) res.push(...ids); else { res.push(...direct); v.points = 20 * bank.length; v.keep = bank.length > 0; }
        break;
      }
      case 'sprint': {
        if (foul) { res.push(...ids); opp.score += 1; } else { v.points = ids.length; v.keep = ids.length > 0; }
        break;
      }
      case 'target': {
        if (foul) res.push(...ids); else { v.points = ids.reduce((a, i) => a + i, 0); v.keep = ids.length > 0; }
        break;
      }
    }
    me.pots += ids.length - res.filter((i) => ids.includes(i)).length;
    return 0;
  }
  private commit(v: Verdict, ids: number[], res: number[], unpend: boolean) {
    const me = this.cur;
    for (const i of ids) if (!res.includes(i)) this.down.add(i);
    for (const i of res) this.down.delete(i);
    v.respot = res; v.potted = ids.filter((i) => !res.includes(i));
    if (unpend) this.pendingCover = -1;
    if (v.pending) this.pendingCover = me.idx;
    if (v.foul) me.fouls++;
  }
  private afterRules(v: Verdict, me: PlayerSt, opp: PlayerSt, ids: number[], foul: string | null) {
    const id = this.id;
    me.score += v.points; if (me.score < 0) me.score = 0;
    if (v.lifeLost) me.lives--;
    if (v.keep) { me.streak += Math.max(1, v.potted.length); me.bestStreak = Math.max(me.bestStreak, me.streak); } else me.streak = 0;
    const tgt = TARGETS[id];
    if (tgt !== undefined) { if (me.score >= tgt) { v.win = me.idx; v.reason = id === 'sprint' ? 'THREE COINS' : `${me.score} POINTS`; } else if (opp.score >= tgt) { v.win = opp.idx; v.reason = id === 'sprint' ? 'THREE COINS' : `${opp.score} POINTS`; } }
    if (id === 'knock' && me.lives <= 0) { v.win = opp.idx; v.reason = 'OUT OF LIVES'; }
    if (this.suddenDeath && v.win < 0) { if (foul) { v.win = opp.idx; v.reason = 'SUDDEN DEATH FOUL'; } else if (v.potted.length > 0) { v.win = me.idx; v.reason = 'SUDDEN DEATH POT'; } }
    if (v.win < 0 && this.live().length === 0 && v.respot.length === 0) { // the board is empty
      if (id === 'free' || id === 'target' || id === 'bank' || id === 'combo' || id === 'sprint' || id === 'rapid') {
        if (id === 'rapid' || id === 'combo') { v.reRack = true; this.down.clear(); }
        else { v.win = me.score >= opp.score ? me.idx : opp.idx; v.reason = 'BOARD CLEARED'; }
      } else if (id === 'knock') { v.reRack = true; this.down.clear(); }
      else { v.win = me.pots >= opp.pots ? me.idx : opp.idx; v.reason = 'BOARD CLEARED'; }
    }
    if (v.win >= 0) { this.finish(v); return; }
    v.nextTurn = v.keep ? this.turn : opp.idx; this.turn = v.nextTurn;
  }
  private finish(v: Verdict) { this.over = true; this.winner = v.win; this.reason = v.reason; v.nextTurn = this.turn; }
  private message(v: Verdict, nPots: number) {
    if (v.win >= 0) { v.msg = 'GAME OVER'; v.sub = v.reason; v.tone = 'info'; return; }
    if (v.foul) { v.msg = 'FOUL!'; const pen = this.colored() ? 'A COIN COMES BACK' : this.id === 'knock' ? 'LIFE LOST' : ''; v.sub = [v.foul, pen].filter(Boolean).join('  '); v.tone = 'bad'; return; }
    if (v.covered) { v.msg = 'QUEEN COVERED!'; v.sub = ''; v.tone = 'good'; return; }
    if (v.pending) { v.msg = 'QUEEN DOWN'; v.sub = 'COVER HER NOW'; v.tone = 'good'; return; }
    if (v.sub) { v.msg = 'CAREFUL'; v.tone = 'info'; return; }
    if (v.lifeLost) { v.msg = 'MISS'; v.sub = 'LIFE LOST'; v.tone = 'bad'; return; }
    if (this.id === 'bank' && v.respot.length && !v.keep) { v.msg = 'NO BANK'; v.sub = 'THE COIN GOES BACK'; v.tone = 'info'; return; }
    if (v.keep) { v.msg = nPots > 1 ? `${nPots} COINS!` : 'NICE SHOT!'; v.sub = v.points > 0 && !this.colored() ? `+${v.points}` : ''; v.tone = 'good'; return; }
    v.msg = ''; v.tone = 'info';
  }
  /** the match clock ran out (rapid fire): decide the winner, or go to sudden death on a tie */
  timeUp(): number { const [a, b] = this.players; if (a.score === b.score) { this.suddenDeath = true; return -1; } this.over = true; this.winner = a.score > b.score ? 0 : 1; this.reason = 'TIME UP'; return this.winner; }
  /** the shot clock ran out */
  shotClockOut(): Verdict { return this.evaluate({ firstContact: -1, contacts: 0, strikerRim: 0, pocketed: [], strikerPocketed: false, rimTouched: [] }, 'OUT OF TIME'); }
  forfeit(who: number) { this.over = true; this.winner = 1 - who; this.reason = 'FORFEIT'; }
  /** progress text for the HUD */
  scoreText(p: number): string {
    const me = this.players[p];
    switch (this.id) {
      case 'free': case 'rapid': case 'combo': case 'bank': case 'target': return String(me.score);
      case 'sprint': return `${me.score}/3`;
      case 'knock': return '♥'.repeat(Math.max(0, me.lives));
      case 'classic': case 'duel': case 'queen': return String(this.liveOwn(p).length);
      default: return '';
    }
  }
}
