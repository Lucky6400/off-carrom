/* Loading screen shown before every match: both players facing off over the hall, a tip, and a bar that fills while the table, floor, portraits and ball
   sprites are baked (so the first frame of the match is smooth). */
import type { Scene } from './manager.js';
import { go } from './manager.js';
import { view, X0, X1, CX } from '../config.js';
import { hallArt, floorArt } from '../gfx/halls.js';
import { boardArt } from '../gfx/board.js';
import { portrait, avatar } from '../gfx/portrait.js';
import { coinSprite, lookOf } from '../gfx/coins.js';
import { STRIKERS } from '../data/items.js';
import { CR, SR } from '../game/physics.js';
import { text, textCanvas } from '../gfx/font.js';
import { fillRR, fillRRr, panel, COL } from '../gfx/ui.js';
import { startMusic } from '../audio.js';
import { LOCS } from '../data/locations.js';
import { charById } from '../data/characters.js';
import { modeById } from '../data/modes.js';
import type { PlayCfg } from '../game/finish.js';
import { boardScaleFor, pocketScale } from './play.js';
import { clamp } from '../util.js';

const TIPS = [
  'DRAG ON THE BOARD TO AIM. HOLD THE RIGHT ARROWS FOR FINE AIM.',
  'THE LEFT ARROWS SLIDE YOUR STRIKER ALONG THE BASELINE.',
  'IN CLASSIC, COVER THE QUEEN WITH ONE OF YOUR COINS ON THE NEXT SHOT.',
  'CLEAR A VENUE TO EARN FIVE POWER-UPS OF ONE KIND.',
  'LONGER STRIKERS SHOW A LONGER AIM LINE. VISIT THE SHOP.',
  'POT YOUR STRIKER AND A COIN COMES BACK ONTO THE BOARD.',
  'BANK A COIN OFF THE RIM TO GET AROUND A BLOCKER.',
  'GRIPS STEADY YOUR FLICK. POWDER MAKES THE BOARD SLICKER.',
];

export function makeLoading(): Scene {
  let cfg!: PlayCfg, t = 0, steps: (() => void)[] = [], done = 0, tip = '';
  return {
    enter(c: PlayCfg) {
      cfg = c; t = 0; done = 0; tip = TIPS[Math.floor(Math.random() * TIPS.length)];
      const L = LOCS[c.loc], S = boardScaleFor();
      steps = [() => floorArt(c.loc), () => boardArt(L.id, L.board, S, pocketScale(c.loc)), () => portrait(c.player, 84, 101, 'normal', false), () => portrait(c.opp, 84, 101, 'normal', false), () => avatar(c.player, 30, 'normal'), () => avatar(c.opp, 30, 'normal'),
        ...[1, 10, 19].map((i) => () => coinSprite(lookOf(c.mode, i), CR * S)), ...STRIKERS.map((st) => () => coinSprite(lookOf(c.mode, 0), SR * S, st)), ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => () => coinSprite(lookOf('target', i), CR * S))];
      startMusic('menu');
    },
    update(dt) { t += dt; for (let i = 0; i < 2 && done < steps.length; i++) steps[done++](); if (done >= steps.length && t > 1.5) go('play', cfg, true); },
    draw(ctx) {
      const L = LOCS[cfg.loc], me = charById(cfg.player), op = charById(cfg.opp), solo = cfg.kind === 'tutorial';
      ctx.drawImage(hallArt(cfg.loc, view.w, view.h), 0, 0); ctx.fillStyle = 'rgba(15,8,2,0.66)'; ctx.fillRect(0, 0, view.w, view.h);
      const mode = modeById(cfg.mode), k = clamp(t / 0.45, 0, 1), e = 1 - Math.pow(1 - k, 3);
      const pw = 96, ph = 116, py = 36;
      // portraits slide in from the sides
      const lx = X0() + 28 - (1 - e) * 80, rx = X1() - 28 - pw + (1 - e) * 80;
      ctx.save(); ctx.globalAlpha = e; for (const [id, x, flip] of [[cfg.player, lx, false], [cfg.opp, rx, true]] as [string, number, boolean][]) {
        fillRRr(ctx, x - 2, py - 2, pw + 4, ph + 4, flip ? '#ff8aa0' : '#f2bd87', 7); ctx.save(); ctx.beginPath(); ctx.roundRect(x, py, pw, ph, 5); ctx.clip(); ctx.drawImage(portrait(id, pw, ph, 'normal', true), x, py); ctx.restore();
      } ctx.restore();
      text(ctx, me.name, lx + pw / 2, py + ph + 6, { align: 'c', bold: true, color: '#ffffff', outline: '#2c1a08' }); text(ctx, me.title, lx + pw / 2, py + ph + 18, { align: 'c', color: '#f2dac3', outline: '#2c1a08' });
      if (!solo) { text(ctx, op.name, rx + pw / 2, py + ph + 6, { align: 'c', bold: true, color: '#ffffff', outline: '#2c1a08' }); text(ctx, op.title, rx + pw / 2, py + ph + 18, { align: 'c', color: '#ffb0bc', outline: '#2c1a08' }); }
      // centre: VS, mode, hall
      const vs = textCanvas('VS', { scale: 3, bold: true, slant: 0.2, color: '#ffffff', color2: '#ffe27a', outline: '#5a3a00', shadow: '#000000' }); ctx.save(); ctx.globalAlpha = e; ctx.drawImage(vs, Math.round(CX() - vs.width / 2), py + 20); ctx.restore();
      text(ctx, solo ? 'TUTORIAL' : mode.name, CX(), py + 64, { align: 'c', bold: true, color: '#ffffff', outline: '#2c1a08' });
      text(ctx, solo ? 'COACH PEPPER' : mode.tag, CX(), py + 78, { align: 'c', color: '#f2dac3', outline: '#2c1a08' });
      text(ctx, L.name, CX(), py + 92, { align: 'c', color: L.accent, outline: '#2c1a08' });
      if (cfg.bet > 0) text(ctx, `BET ${cfg.bet}`, CX(), py + 106, { align: 'c', color: '#ffd23a', outline: '#3a2000' });
      // bar and tip
      const bw = Math.min(260, view.w - 60), bx = CX() - bw / 2, by = view.h - view.sb - 40, f = done / Math.max(1, steps.length);
      fillRRr(ctx, bx - 1.5, by - 1.5, bw + 3, 12, COL.mint, 6); fillRRr(ctx, bx, by, bw, 9, '#120b04', 4.5); fillRRr(ctx, bx, by, Math.max(6, bw * f), 9, '#d7914b', 4.5); fillRR(ctx, bx, by, Math.max(6, bw * f), 3.4, 'rgba(255,255,255,0.4)', 2);
      text(ctx, 'LOADING', CX(), by - 12, { align: 'c', bold: true, color: '#ffffff', outline: '#2c1a08' });
      text(ctx, tip, CX(), by + 14, { align: 'c', color: '#edca5c', outline: '#2c1a08' });
      void panel; void X0;
    },
    back() { return true; },
  };
}
