/* Headless checks: AI vs AI games for every rule set (rules + AI + physics must finish every game). Usage: npm run sim [mode] [games] */
import { Match } from '../src/game/match.js';
import { planShot } from '../src/game/ai.js';
import { advance, isSettled, CR, SR } from '../src/game/physics.js';
import { MODES, type GameId } from '../src/data/modes.js';

const only = process.argv[2] as GameId | undefined, N = +(process.argv[3] ?? 3);
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
for (const md of MODES) {
  if (only && md.id !== only) continue;
  const res = { wins: [0, 0], shots: 0, pots: 0, fouls: 0, keeps: 0, unfinished: 0, ms: 0, simT: 0 };
  for (let n = 0; n < N; n++) {
    const m = new Match(md.id, 1, [true, true], n & 1);
    // sanity: no overlapping coins in the rack
    const cs = m.sim.coins; for (let i = 1; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) if (Math.hypot(cs[i].x - cs[j].x, cs[i].y - cs[j].y) < 2 * CR - 1e-6) console.log('OVERLAP in rack', md.id, cs[i].id, cs[j].id);
    let shots = 0; const t0 = performance.now();
    while (!m.game.over && shots < 160) {
      const g = m.game, skill = 0.75, plan = planShot(g, m.sim, skill, rnd);
      m.placeStriker(plan.x); m.fire({ angle: plan.angle, speed: plan.speed });
      let t = 0; while (t < 20) { advance(m.sim, 1 / 60); t += 1 / 60; m.sim.events.length = 0; if (m.sim.calm > 0.3 && isSettled(m.sim)) break; }
      res.simT += t;
      const who = g.turn, v = m.settle(); shots++; res.pots += v.potted.length; if (v.foul) res.fouls++; if (v.keep) res.keeps++;
      void who;
      if (m.sim.coins.some((c) => c.id === 0 && c.r !== SR)) console.log('striker corrupt');
    }
    res.ms += performance.now() - t0; res.shots += shots;
    if (m.game.over) res.wins[m.game.winner]++; else res.unfinished++;
    if (n === 0) console.log(`  ${md.id}: first game -> winner ${m.game.winner} (${m.game.reason}) after ${shots} shots; live ${m.game.live().length}`);
  }
  console.log(`${md.id.padEnd(8)} games ${N}  wins ${res.wins.join('-')}  unfinished ${res.unfinished}  avg shots ${(res.shots / N).toFixed(1)}  pots/shot ${(res.pots / res.shots).toFixed(2)}  fouls ${res.fouls}  keeps ${res.keeps}  avg roll ${(res.simT / res.shots).toFixed(1)}s  cpu ${(res.ms / res.shots).toFixed(0)}ms/shot`);
}
