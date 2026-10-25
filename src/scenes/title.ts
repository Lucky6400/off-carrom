/* Publisher splash, the "tap to start" brand screen and the main menu: Career, Quick Match, Tournament as big neon rings, Options (gear) and Profile (avatar). */
import type { Scene } from './manager.js';
import { go } from './manager.js';
import { view, X0, X1, CX, Y0 } from '../config.js';
import { ptr } from '../input.js';
import { save } from '../save.js';
import { hallArt } from '../gfx/halls.js';
import { text, textWidth, textHeight } from '../gfx/font.js';
import { drawCoin, drawShadow, lookOf } from '../gfx/coins.js';
import { STRIKERS } from '../data/items.js';
import { icon, hit, roundBtn } from '../gfx/ui.js';
import { rightPills } from '../gfx/hud.js';
import { avatar } from '../gfx/portrait.js';
import { charById } from '../data/characters.js';
import { sfx, startMusic } from '../audio.js';
import { hash2, shade } from '../util.js';
import { CB, neonFrame, clipRR } from './common.js';
import { menuCardArt, profileCardArt } from '../gfx/cards.js';
import { portrait } from '../gfx/portrait.js';
import { fit } from '../gfx/ui.js';
import { startQuick } from './quick.js';

const logoImg = new Image(); logoImg.src = './brand/arcadoff-logo.png';

/** "OFF CARROM" with a striker disc as the O, built from the real glyph metrics so it lines up */
export function logo(ctx: CanvasRenderingContext2D, cx: number, y: number, t: number, scale = 1) {
  const sc = 2.9, cap = textHeight({ scale: sc, bold: true }), r = cap / 2 + 3.5, wFF = textWidth('FF', { scale: sc, bold: true }), wP = textWidth('CARROM', { scale: sc, bold: true }), gap = 9;
  const total = 2 * r + 1.5 + wFF + gap + wP, x0 = -total / 2;
  ctx.save(); ctx.translate(cx, y); ctx.scale(scale, scale);
  const g = ctx.createRadialGradient(0, cap / 2, 4, 0, cap / 2, 150); g.addColorStop(0, 'rgba(222,151,78,0.45)'); g.addColorStop(1, 'rgba(222,151,78,0)'); ctx.fillStyle = g; ctx.fillRect(-170, -60, 340, 140);
  const midY = 4 + cap / 2; drawShadow(ctx, x0 + r, midY, r, 0.4); drawCoin(ctx, lookOf('classic', 0), x0 + r, midY, r, { striker: STRIKERS[6], rot: t * 0.5 });
  const o = { scale: sc, bold: true, slant: 0.2, color: '#ffffff', color2: '#f2dac3', outline: '#2c1a08', shadow: '#000000' };
  text(ctx, 'FF', x0 + 2 * r + 1.5, 4, { ...o, align: 'l' }); text(ctx, 'CARROM', x0 + 2 * r + 1.5 + wFF + gap, 4, { ...o, color2: '#ffe27a', align: 'l' });
  text(ctx, 'ARCADE CARROM', 0, 4 + cap + 14, { align: 'c', color: '#f2dac3', outline: '#2c1a08', bold: true, spacing: 2 });
  ctx.restore(); void t;
}

export function makeArcadoff(): Scene {
  let t = 0, gone = false; const TIME = 2.4;
  return {
    enter() { t = 0; gone = false; },
    update(dt) { t += dt; },
    draw(ctx) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, view.w, view.h);
      if (logoImg.complete && logoImg.naturalWidth) { const a = Math.max(0, Math.min(1, t / 0.45, (TIME - t) / 0.45)), w = Math.min(view.w * 0.5, 260), h = (w * logoImg.naturalHeight) / logoImg.naturalWidth; ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(logoImg, (view.w - w) / 2, (view.h - h) / 2, w, h); ctx.restore(); }
      if (!gone && (t >= TIME || ptr.pressed)) { gone = true; go('brand', undefined, true); }
    },
  };
}

function bgDim(ctx: CanvasRenderingContext2D, a: number) { ctx.drawImage(hallArt(0, view.w, view.h), 0, 0); ctx.fillStyle = `rgba(18,11,4,${a})`; ctx.fillRect(0, 0, view.w, view.h); }
function motes(ctx: CanvasRenderingContext2D, t: number) { for (let i = 0; i < 30; i++) { const a = (t * 0.1 + hash2(i, 1)) % 1; ctx.fillStyle = `rgba(245,203,161,${0.4 * (1 - a)})`; ctx.fillRect(hash2(i, 2) * view.w, view.h - a * view.h * 0.9, 1, 1); } }

export function makeBrand(): Scene {
  let t = 0;
  return {
    enter() { t = 0; },
    update(dt) { t += dt; },
    draw(ctx) {
      bgDim(ctx, 0.7); motes(ctx, t); logo(ctx, CX(), view.h * 0.28, t, 1.25);
      text(ctx, 'TAP TO START', CX(), view.h * 0.78, { align: 'c', bold: true, color: '#ffffff', outline: '#2c1a08', alpha: 0.55 + 0.45 * Math.sin(t * 5) });
      if (ptr.pressed) { sfx('click'); go('title'); }
    },
  };
}

/** a thick neon ring with a jagged lightning edge */
function lightningRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string, pressed: boolean, seed: number) {
  const N = 44, pts: [number, number][] = [];
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, d = (hash2(i, seed) - 0.5) * 3.4 * (i % 2 ? 1 : 0.55); pts.push([cx + Math.cos(a) * (r + d), cy + Math.sin(a) * (r + d)]); }
  const path = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
  ctx.save(); ctx.lineJoin = 'round';
  ctx.shadowColor = col; ctx.shadowBlur = (pressed ? 8 : 16) * view.rs; ctx.strokeStyle = col; ctx.lineWidth = 4.6; path(); ctx.stroke(); ctx.shadowBlur = 5 * view.rs; ctx.lineWidth = 2.8; path(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; path(); ctx.stroke();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r); g.addColorStop(0, pressed ? '#704a24' : '#533516'); g.addColorStop(1, pressed ? '#2c1b0a' : '#160d04'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r - 3.4, 0, 7); ctx.fill();
  const h = ctx.createLinearGradient(0, cy - r, 0, cy); h.addColorStop(0, 'rgba(255,255,255,0.26)'); h.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = h; ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.44, r * 0.74, r * 0.46, 0, 0, 7); ctx.fill();
  ctx.restore();
}

export function makeTitle(): Scene {
  let t = 0;
  type Card = { label: string; kind: 'career' | 'quick' | 'tournament' | 'options' | 'profile'; col: string; act: () => void };
  const CARDS: Card[] = [
    { label: 'CAREER', kind: 'career', col: '#d7914b', act: () => go('hub') },
    { label: 'QUICK MATCH', kind: 'quick', col: '#edc65c', act: () => startQuick() },
    { label: 'TOURNAMENT', kind: 'tournament', col: '#ffd23a', act: () => go('tournament') },
    { label: 'OPTIONS', kind: 'options', col: '#c7893b', act: () => go('options') },
    { label: 'PROFILE', kind: 'profile', col: '#7ab8ff', act: () => go('profile') },
  ];
  const card = (ctx: CanvasRenderingContext2D, c: Card, x: number, y: number, w: number, h: number) => {
    const hh = hit(x, y, w, h, true), pr = hh.down, yy = y + (pr ? 1 : 0);
    neonFrame(ctx, x, yy, w, h, c.col, 7, pr ? 6 : 14); clipRR(ctx, x, yy, w, h, 7);
    if (c.kind === 'profile') { const ch = charById(save.char), ph = Math.round(h * 1.18), pw = Math.round(ph / 1.2); ctx.drawImage(profileCardArt(ch.id, w, h), x, yy); ctx.save(); ctx.shadowColor = shade(ch.look.bg[0], 0.5); ctx.shadowBlur = 9 * view.rs; ctx.drawImage(portrait(ch.id, pw, ph, 'normal', false), Math.round(x + (w - pw) / 2), Math.round(yy - ph * 0.06)); ctx.restore(); } else ctx.drawImage(menuCardArt(c.kind, w, h), x, yy);
    const bh = 17, g = ctx.createLinearGradient(0, yy + h - bh, 0, yy + h); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0.78)'); ctx.fillStyle = g; ctx.fillRect(x, yy + h - bh, w, bh);
    text(ctx, c.label, x + w / 2, yy + h - bh + (bh - 7) / 2, { align: 'c', bold: true, scale: fit(c.label, w - 12, { bold: true }, 1), color: '#ffffff', outline: '#180e04' });
    ctx.restore(); if (hh.click) { sfx('click'); c.act(); }
  };
  return {
    enter() { t = 0; },
    update(dt) { t += dt; startMusic('menu'); },
    draw(ctx) {
      bgDim(ctx, 0.62); motes(ctx, t);
      const lg = 0.72; logo(ctx, X0() + 10 + 112 * lg, Y0() + 6, t, lg); rightPills(ctx, X1(), Y0() + 4);
      const m = 10, g = 8, top = 50, bot = CB(), h1 = Math.round((bot - top - g) * 0.58), h2 = bot - top - g - h1, W = X1() - X0() - 2 * m;
      const w3 = (W - 2 * g) / 3, w2 = (W - g) / 2;
      for (let i = 0; i < 3; i++) card(ctx, CARDS[i], X0() + m + i * (w3 + g), top, w3, h1);
      for (let i = 0; i < 2; i++) card(ctx, CARDS[3 + i], X0() + m + i * (w2 + g), top + h1 + g, w2, h2);
    },
    back() { return true; },
  };
}
