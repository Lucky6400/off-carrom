/* Computer player: for every (coin, pocket) pair it works out where the striker has to hit the coin (the ghost point), checks the lanes, then plays the best few
   through the real physics (with a couple of striker positions and powers) and keeps the best verdict. Mistakes are added afterwards according to skill. */
import { CR, SR, HB, BASE_X, BASE_Y, cloneSim, shoot, runToRest, laneClear, freeSpot, powerToSpeed, speedToPower, type Sim } from './physics.js';
import { coinValue, QUEEN, type Game } from './rules.js';

export interface Plan { x: number; angle: number; speed: number; score: number; target: number; pocket: number }
const gauss = (r: () => number) => (r() + r() + r() + r() - 2) * 1.2;
const DECEL = 0.205 * 9.81;

interface Cand { id: number; pk: number; x: number; angle: number; d1: number; d2: number; cut: number; q: number }
function candidates(g: Game, s: Sim, xs: number[], by: number, sgn: number, limit: number): Cand[] {
  const out: Cand[] = [], goals = g.goals();
  for (const id of goals) {
    const c = s.coins.find((x) => x.id === id); if (!c || c.state !== 0) continue;
    for (let k = 0; k < s.board.pockets.length; k++) {
      const p = s.board.pockets[k], d2 = Math.hypot(p.x - c.x, p.y - c.y); if (d2 < 0.045) continue;
      const ux = (p.x - c.x) / d2, uy = (p.y - c.y) / d2, gx = c.x - ux * (SR + CR), gy = c.y - uy * (SR + CR);
      if (Math.abs(gx) > HB - SR || Math.abs(gy) > HB - SR) continue;
      if (!laneClear(s, c.x, c.y, p.x, p.y, CR, [0, id])) continue;
      for (const x of xs) {
        const vx = gx - x, vy = gy - by, d1 = Math.hypot(vx, vy); if (d1 < 0.03) continue;
        if (vy * sgn < d1 * 0.12) continue; // the striker is flicked forward
        const cut = (vx / d1) * ux + (vy / d1) * uy; if (cut < 0.25) continue;
        if (!laneClear(s, x, by, gx, gy, SR, [0, id])) continue;
        out.push({ id, pk: k, x, angle: Math.atan2(vy, vx), d1, d2, cut, q: cut * 2.4 - d1 * 0.8 - d2 * 1.6 + (id === QUEEN ? 0.2 : 0) + coinValue(id) * 0.004 });
      }
    }
  }
  return out.sort((a, b) => b.q - a.q).slice(0, limit);
}

function judge(g: Game, s0: Sim, x: number, by: number, angle: number, speed: number): number {
  const s = cloneSim(s0), st = s.coins[0]; st.x = x; st.y = by; st.vx = st.vy = 0; shoot(s, { angle, speed }); runToRest(s, 12);
  const g2 = g.clone(), v = g2.evaluate(s.shot);
  if (v.win >= 0) return v.win === g.turn ? 1000 : -1000;
  let score = -10;
  if (v.foul) score = -220;
  else if (v.keep) score = 100 + 25 * Math.max(0, v.potted.length - 1) + v.points * 0.6;
  else if (v.lifeLost) score = -150;
  if (g.colored()) for (const id of v.potted) if (!g.mine(id) && id !== QUEEN) score -= 45; // helping the rival
  return score;
}

/** best shot from the current layout (the striker may start from any x on the baseline) */
export function planShot(g: Game, s: Sim, skill: number, rnd: () => number = Math.random, perfect = false): Plan {
  const sgn = g.turn === 0 ? 1 : -1, by = -sgn * BASE_Y, cur = s.coins[0].x;
  const free = (x: number) => freeSpot(s, x, by, SR, 0);
  const xs: number[] = []; const nx = perfect || skill > 0.55 ? 11 : 7;
  for (let i = 0; i < nx; i++) { const x = -BASE_X + (2 * BASE_X * i) / (nx - 1); if (free(x)) xs.push(x); }
  if (free(cur) && !xs.includes(cur)) xs.push(cur);
  if (!xs.length) xs.push(cur);
  const cands = candidates(g, s, xs, by, sgn, perfect || skill > 0.6 ? 9 : 5);
  let best: Plan | null = null;
  const speedFor = (c: Cand) => { const vc = Math.sqrt(2 * DECEL * (c.d2 + 0.12)) + 0.35, vs = vc / (1.4 * Math.max(0.3, c.cut)), v0 = Math.sqrt(vs * vs + 2 * DECEL * c.d1); return Math.min(6.4, Math.max(0.9, v0)); };
  for (const c of cands) {
    const base = speedFor(c);
    for (const mul of [0.95, 1.3]) {
      const sp = Math.min(6.9, base * mul), sc = judge(g, s, c.x, by, c.angle, sp);
      if (!best || sc > best.score) best = { x: c.x, angle: c.angle, speed: sp, score: sc, target: c.id, pocket: c.pk };
    }
  }
  if (!best || best.score < 60) { // nothing pots cleanly: probe a few shots at random (finds bank shots and combinations)
    const live = s.coins.filter((c) => c.id !== 0 && c.state === 0), tries = perfect ? 26 : 12;
    for (let i = 0; i < tries && live.length; i++) {
      const x = xs[Math.floor(rnd() * xs.length)], t = live[Math.floor(rnd() * live.length)];
      const a = Math.atan2(t.y - by, t.x - x) + (rnd() - 0.5) * 0.5; if (Math.sin(a) * sgn < 0.12) continue;
      const sp = 1.2 + rnd() * 5.2, sc = judge(g, s, x, by, a, sp);
      if (!best || sc > best.score) best = { x, angle: a, speed: sp, score: sc, target: t.id, pocket: -1 };
    }
  }
  if (!best) { const a = Math.PI / 2 * sgn; best = { x: xs[0], angle: a, speed: 2, score: -999, target: -1, pocket: -1 }; }
  if (perfect) return best;
  // human error
  const sg = 1.9 * Math.pow(1 - skill, 1.6) + 0.06, r: Plan = { ...best };
  r.angle += (gauss(rnd) * (sg * Math.PI)) / 180;
  r.speed *= 1 + gauss(rnd) * (0.02 + 0.15 * (1 - skill)); r.speed = Math.max(0.6, Math.min(6.9, r.speed));
  if (rnd() < (1 - skill) * 0.1) r.angle += (rnd() - 0.5) * 0.2;
  return r;
}
export { speedToPower, powerToSpeed };
