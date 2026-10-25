/* Developer scenes reached through the URL hash: #dev:board:<loc>:<game> (board + coins, click to shoot), #dev:chars, #dev:halls:<page>, #dev:hall:<n>, #dev:floor:<n>, #dev:coins. */
import type { Scene } from './manager.js';
import { view } from '../config.js';
import { ptr } from '../input.js';
import { Match } from '../game/match.js';
import { advance } from '../game/physics.js';
import { LOCS } from '../data/locations.js';
import { STRIKERS } from '../data/items.js';
import type { GameId } from '../data/modes.js';
import { boardArt } from '../gfx/board.js';
import { lookOf, drawCoin, drawShadow } from '../gfx/coins.js';
import { CHARS } from '../data/characters.js';
import { portrait } from '../gfx/portrait.js';
import { text } from '../gfx/font.js';
import { hallArt, floorArt } from '../gfx/halls.js';

export function makeDev(): Scene {
  let kind = 'board', loc = 0, game: GameId = 'classic', m: Match, t = 0;
  const reset = () => { const L = LOCS[loc]; m = new Match(game, L.board.pockets, [false, false]); };
  return {
    enter(hash: string) {
      const p = (hash ?? 'dev:board').split(':'); kind = p[1] ?? 'board'; loc = +(p[2] ?? 0); game = (p[3] ?? 'classic') as GameId; reset();
    },
    update(dt) { t += dt; if (kind === 'board') advance(m.sim, Math.min(dt, 1 / 20)); },
    draw(ctx) {
      if (kind === 'chars' && loc > 0) { ctx.fillStyle = '#26180a'; ctx.fillRect(0, 0, view.w, view.h); [(loc - 1) * 3, (loc - 1) * 3 + 1, (loc - 1) * 3 + 2].forEach((n, k) => { const c = CHARS[n % CHARS.length]; ctx.drawImage(portrait(c.id, 130, 156, 'normal', true), 8 + k * 138, 8); text(ctx, c.name, 8 + k * 138 + 65, 168, { align: 'c', outline: '#000' }); }); return; }
      if (kind === 'chars') {
        ctx.fillStyle = '#26180a'; ctx.fillRect(0, 0, view.w, view.h);
        CHARS.forEach((c, i) => { const x = 4 + (i % 7) * 60, y = 4 + Math.floor(i / 7) * 78; ctx.drawImage(portrait(c.id, 56, 67, 'normal', true), x, y); text(ctx, c.name.split(' ')[0], x + 28, y + 69, { align: 'c', outline: '#000' }); });
        return;
      }
      if (kind === 'halls') { // contact sheet: four venues per page (#dev:halls:<page>)
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, view.w, view.h);
        for (let i = 0; i < 4; i++) { const n = loc * 4 + i; if (n >= LOCS.length) break; const w = view.w / 2 - 2, h = view.h / 2 - 2, x = (i % 2) * (w + 4), y = Math.floor(i / 2) * (h + 4); ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(hallArt(n, w, h), x, y); ctx.restore(); text(ctx, LOCS[n].name, x + 4, y + 4, { outline: '#000' }); }
        return;
      }
      if (kind === 'hall') { ctx.drawImage(hallArt(loc, view.w, view.h), 0, 0); return; }
      if (kind === 'floor') { ctx.drawImage(floorArt(loc), 0, 0); return; }
      if (kind === 'coins') {
        ctx.fillStyle = '#613c18'; ctx.fillRect(0, 0, view.w, view.h);
        [1, 10, 19].forEach((id, i) => { drawShadow(ctx, 40 + i * 50, 50, 16); drawCoin(ctx, lookOf('classic', id), 40 + i * 50, 50, 16); });
        for (let i = 1; i <= 8; i++) drawCoin(ctx, lookOf('target', i), 20 + i * 36, 100, 14);
        STRIKERS.forEach((s, i) => { drawShadow(ctx, 34 + i * 48, 160, 20); drawCoin(ctx, lookOf('classic', 0), 34 + i * 48, 160, 20, { striker: s, rot: t * 0.6 }); });
        text(ctx, 'coins, numbered coins and the eight strikers', 6, 4, { outline: '#000' }); return;
      }
      const L = LOCS[loc], S = Math.min((view.w - 40) / 0.88, 226 / 0.88);
      ctx.fillStyle = '#271a0d'; ctx.fillRect(0, 0, view.w, view.h);
      const art = boardArt(L.id, L.board, S, L.board.pockets), tx = view.w / 2, ty = view.h / 2;
      ctx.drawImage(art.cv, tx - art.ox, ty - art.oy);
      for (const c of m.sim.coins) { if (c.state === 2) continue; drawShadow(ctx, tx + c.x * S, ty - c.y * S, c.r * S); }
      for (const c of m.sim.coins) { if (c.state === 2) continue; drawCoin(ctx, lookOf(game, c.id), tx + c.x * S, ty - c.y * S, c.r * S, { striker: STRIKERS[2], rot: c.rot, alpha: c.state === 1 ? 0.6 : 1 }); }
      text(ctx, `${L.name}  ${game}   click to shoot`, 6, 4, { outline: '#000' });
      if (ptr.pressed) { reset(); m.placeStriker((Math.random() - 0.5) * 0.3); m.fire({ angle: Math.PI / 2 + (Math.random() - 0.5) * 0.2, speed: 5.5 }); }
    },
  };
}
