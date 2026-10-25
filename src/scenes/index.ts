/* Scene registry and the debug entry points: #title, #hub, #map, #hall:<loc>, #shop, #options, #profile, #tournament, #quick, #load:<mode>:<loc>,
   #play:<mode>:<loc>:<kind>:<opp>, #tutorial, #result:win, #dev:board / coins / halls / hall:<n> / floor:<n> / chars. */
import type { Scene } from './manager.js';
import { makeDev } from './dev.js';
import { makePlay } from './play.js';
import { makeArcadoff, makeBrand, makeTitle } from './title.js';
import { makeHub, makeMap, makeHall } from './career.js';
import { makeSelect } from './select.js';
import { makeQuick, makeSetup } from './quick.js';
import { makeTournament } from './tournament.js';
import { makeShop } from './shop.js';
import { makeOptions, makeProfile } from './options.js';
import { makeLoading } from './loading.js';
import { makeResult } from './result.js';
import type { PlayCfg, Summary } from '../game/finish.js';
import type { GameId } from '../data/modes.js';
import { save } from '../save.js';

export function registerAll(register: (name: string, f: () => Scene) => void) {
  register('dev', makeDev); register('play', makePlay); register('arcadoff', makeArcadoff); register('brand', makeBrand); register('title', makeTitle);
  register('hub', makeHub); register('map', makeMap); register('hall', makeHall); register('select', makeSelect); register('quick', makeQuick); register('setup', makeSetup);
  register('tournament', makeTournament); register('shop', makeShop); register('options', makeOptions); register('profile', makeProfile); register('loading', makeLoading); register('result', makeResult);
}
export function firstScene(hash: string): { name: string; params?: any } {
  const hp = hash.split(':'), cfgOf = (): PlayCfg => ({ mode: (hp[1] ?? 'classic') as GameId, loc: +(hp[2] ?? 0), player: save.char, opp: hp[4] ?? 'babulal', kind: (hp[3] ?? 'quick') as PlayCfg['kind'], bet: 0, title: 'DEBUG', auto: hash.includes(':auto'), career: (hp[3] === 'career' ? { loc: +(hp[2] ?? 0), game: 0 } : undefined) });
  if (hp[0].startsWith('dev')) return { name: 'dev', params: hash };
  switch (hp[0]) {
    case 'play': return { name: 'play', params: cfgOf() };
    case 'load': return { name: 'loading', params: cfgOf() };
    case 'tutorial': return { name: 'play', params: { mode: 'classic', loc: 0, player: save.char, opp: 'coach', kind: 'tutorial', bet: 0, title: 'TUTORIAL' } as PlayCfg };
    case 'setup': return { name: 'setup', params: { player: save.char, opp: 'babulal', mode: +(hp[1] ?? 0), loc: +(hp[2] ?? 0), bet: 0 } };
    case 'hall': return { name: 'hall', params: { loc: +(hp[1] ?? 0) } };
    case 'result': {
      const cfg: PlayCfg = { mode: 'classic', loc: 0, player: save.char, opp: 'babulal', kind: 'career', bet: 0, title: 'DEBUG', career: { loc: 0, game: 0 } }, win = hp[1] !== 'lose';
      const s: Summary = { cfg, win, reason: 'CLEARED ALL COINS', rows: [{ label: 'COINS POTTED', xp: 80, coins: 160 }, { label: 'STREAK BONUS', xp: 150, coins: 150 }, { label: 'GAME WIN BONUS', xp: 300, coins: 50 }, { label: 'FIRST CLEAR', xp: 160, coins: 100 }], xp: 690, coins: 460, levelBefore: 1, xpBefore: 700, xpNextBefore: 600, levelAfter: 2, xpAfter: 290, xpNext: 920, pots: 8, streak: 5, stageClear: true, locClear: true, reward: { id: 'eagle', n: 5 }, unlockedLoc: 1, scores: [0, 0], fouls: 0 };
      return { name: 'result', params: s };
    }
    case 'title': case 'hub': case 'map': case 'shop': case 'options': case 'profile': case 'tournament': case 'quick': case 'brand': return { name: hp[0] };
  }
  return { name: 'arcadoff' };
}
