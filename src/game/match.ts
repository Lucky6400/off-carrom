/* A match = rules (Game) + physics (Sim) + the glue: take a shot, judge it, apply the verdict to the coins (respots, re-racks, the striker back on the baseline),
   and snapshots for the Rewind power-up. Headless: used by the play scene and by scripts/sim.ts. */
import type { GameId } from '../data/modes.js';
import { Game, rackCoins, spotCoin, type Verdict } from './rules.js';
import { makeBoard, newSim, shoot, cloneSim, freeSpot, BASE_X, BASE_Y, SR, type Sim, type ShotParams, type Board } from './physics.js';

export interface Snapshot { sim: Sim; game: Game }
export class Match {
  game: Game; sim: Sim; mode: GameId; board: Board; shots = 0; saved: Snapshot | null = null;
  constructor(mode: GameId, pocketK: number, ai: [boolean, boolean], firstTurn = 0) {
    this.mode = mode; this.board = makeBoard(pocketK);
    this.sim = newSim(this.board, rackCoins(mode));
    this.game = new Game(mode, ai);
    this.game.turn = firstTurn;
    this.placeStriker(0);
  }
  get striker() { return this.sim.coins[0]; }
  /** y of the baseline of the player on turn */
  baseY(p = this.game.turn) { return p === 0 ? -BASE_Y : BASE_Y; }
  canPlace(x: number): boolean { return Math.abs(x) <= BASE_X + 1e-6 && freeSpot(this.sim, x, this.baseY(), SR, 0, 1.0); }
  /** nearest legal x to the wanted one (the wanted one if it is free) */
  nearestFree(x: number): number {
    x = Math.max(-BASE_X, Math.min(BASE_X, x)); if (this.canPlace(x)) return x;
    for (let d = 0.004; d <= 2 * BASE_X; d += 0.004) for (const s of [1, -1]) { const xx = x + s * d; if (Math.abs(xx) <= BASE_X && this.canPlace(xx)) return xx; }
    return x;
  }
  placeStriker(x: number) { const c = this.striker; c.state = 0; c.x = this.nearestFree(x); c.y = this.baseY(); c.vx = c.vy = 0; c.pocket = -1; c.fallT = 0; }
  /** keep the state so Rewind can retake the shot */
  snapshot() { this.saved = { sim: cloneSim(this.sim), game: this.game.clone() }; }
  restore() { if (!this.saved) return; const ai = this.game.players.map((p) => p.ai); this.sim = cloneSim(this.saved.sim); this.game = this.saved.game.clone(); this.board = this.sim.board; this.game.players.forEach((p, i) => { p.ai = ai[i]; }); }
  fire(p: ShotParams, mods: { magnet?: number; sticky?: boolean; glide?: number } = {}) {
    this.sim.magnet = mods.magnet ?? 1; this.sim.sticky = !!mods.sticky; this.sim.glide = mods.glide ?? 1; shoot(this.sim, p); this.shots++;
  }
  /** judge the finished shot and put the coins right for the next one */
  settle(): Verdict { const v = this.game.evaluate(this.sim.shot); this.apply(v); return v; }
  apply(v: Verdict) {
    const s = this.sim, keep = this.striker.x;
    if (v.reRack) { const nc = rackCoins(this.mode); s.coins = nc; }
    else for (const id of v.respot) spotCoin(s, id);
    this.placeStriker(this.game.over ? 0 : keep);
  }
}
