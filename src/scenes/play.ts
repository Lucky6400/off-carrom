/* The match. Phases: intro -> aim -> shot (the flick) -> roll -> verdict -> ... -> over.
   Controls: the two arrows on the LEFT slide the striker along your baseline (or drag the striker itself); the two arrows on the RIGHT turn the aim (or drag anywhere on the board);
   the power bar sets the strength; the big striker button flicks. The bolt opens the power-up tray. The computer plans a shot with the AI, then slides, aims, powers up and flicks the same way. */
import type { Scene } from './manager.js';
import { go } from './manager.js';
import { view, X0, X1, Y0 } from '../config.js';
import { ptr, keys, keyPressed, inRect, holdingIn } from '../input.js';
import { Match } from '../game/match.js';
import { advance, castRay, isSettled, powerToSpeed, speedToPower, HB, SR, CR, BASE_X } from '../game/physics.js';
import { planShot, type Plan } from '../game/ai.js';
import { RAPID_TIME, shotClockOf, TARGETS, QUEEN, type Verdict } from '../game/rules.js';
import { finishMatch, type PlayCfg } from '../game/finish.js';
import { LOCS } from '../data/locations.js';
import { charById, shortName } from '../data/characters.js';
import { strikerById, gripById, powderById, powerById, POWERS, STRIKERS, type PowerId } from '../data/items.js';
import { modeById } from '../data/modes.js';
import { save, persist, powerCount, addCoins } from '../save.js';
import { sfx, startMusic, vibrate } from '../audio.js';
import { text, textWidth, wrap } from '../gfx/font.js';
import { avatar, type Expr } from '../gfx/portrait.js';
import { boardArt, FRAME_W, type BoardArt } from '../gfx/board.js';
import { floorArt } from '../gfx/halls.js';
import { lookOf, drawCoin, drawShadow, drawCoinIcon } from '../gfx/coins.js';
import { powerIcon } from '../gfx/gearfx.js';
import { fillRR, fillRRr, panel, capsule, roundBtn, iconCanvas, COL } from '../gfx/ui.js';
import { pill, bigBanner, type Banner } from '../gfx/hud.js';
import { grabFrame } from '../gfx/snap.js';
import { settingsBody, ROW_H, SETTINGS_ROWS } from '../gfx/settings.js';
import { clamp, lerp, TAU } from '../util.js';

type Phase = 'intro' | 'aim' | 'aiWait' | 'shot' | 'roll' | 'verdict' | 'over';
interface Part { x: number; y: number; vx: number; vy: number; t: number; life: number; c: string; s: number }
interface Float { x: number; y: number; text: string; col: string; t: number }
interface TutStep { text: string; kind: 'next' | 'do'; focus?: 'slide' | 'aim' | 'arrows' | 'power' | 'bolt' | 'shoot' | 'pot' }

/** pocket size factor of a venue's board for a game */
export const pocketScale = (loc: number) => LOCS[loc].board.pockets;
const FW = HB + FRAME_W; // half the framed board in metres
/** pixels per metre the board is drawn at (shared with the loading screen, which pre-bakes the art) */
export function boardScaleFor(): number { return Math.min((view.h - view.sb - Y0() - 6) / (2 * FW), (X1() - X0() - 124) / (2 * FW)); }
const angDiff = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.2;

const TUT: TutStep[] = [
  { kind: 'next', text: 'HI, I AM COACH PEPPER! LET US LEARN CARROM. TAP NEXT.' },
  { kind: 'do', focus: 'slide', text: 'HOLD THE LEFT ARROWS TO SLIDE YOUR STRIKER ALONG THE BASELINE. YOU CAN ALSO DRAG THE STRIKER.' },
  { kind: 'do', focus: 'aim', text: 'DRAG YOUR FINGER ON THE BOARD TO AIM. THE LINE SHOWS WHERE THE STRIKER GOES.' },
  { kind: 'do', focus: 'arrows', text: 'HOLD THE RIGHT ARROWS FOR FINE AIM. HOLD LONGER TO TURN FASTER.' },
  { kind: 'do', focus: 'power', text: 'DRAG THE POWER BAR. MORE POWER MEANS A FASTER STRIKER.' },
  { kind: 'do', focus: 'bolt', text: 'TAP THE LIGHTNING TO SEE YOUR POWER-UPS. TAP ONE TO ARM IT FOR YOUR NEXT SHOT.' },
  { kind: 'do', focus: 'pot', text: 'NOW POT A COIN! SLIDE, AIM, SET YOUR POWER AND TAP THE STRIKER BUTTON.' },
  { kind: 'next', text: 'CLASSIC: POT ALL NINE OF YOUR COLOUR, THEN THE QUEEN. COVER HER WITH ONE OF YOUR COINS ON THE NEXT SHOT OR SHE GOES BACK.' },
  { kind: 'next', text: 'FREESTYLE: ANY COIN SCORES. WHITE IS 20, BLACK IS 10 AND THE QUEEN IS 50. FIRST TO 100 WINS.' },
  { kind: 'next', text: 'MATCH PLAY: CLASSIC RULES OVER SEVERAL BOARDS. WIN A BOARD TO SCORE THE RIVAL COINS LEFT PLUS 3 FOR THE QUEEN. FIRST TO 12.' },
  { kind: 'next', text: 'FOULS: POTTING YOUR STRIKER SENDS A COIN BACK ONTO THE BOARD AND ENDS YOUR TURN.' },
  { kind: 'next', text: 'YOU ARE READY! TAKE 100 COINS FOR FINISHING SCHOOL. GOOD LUCK OUT THERE!' },
];

export function makePlay(): Scene {
  let cfg!: PlayCfg, m!: Match, S = 100, tx = 0, ty = 0, art!: BoardArt, skill = 0.5, aiStriker = STRIKERS[0];
  let phase: Phase = 'intro', phaseT = 0, t = 0;
  let aim = Math.PI / 2, power = 0.5, armed: PowerId[] = [];
  let trayOpen = false, paused = false, showRules = false, confirmQuit = false, showOpts = false;
  let banner: Banner | null = null; const toasts: { text: string; t: number; col: string }[] = [];
  let flickPull = 0, shotT = 0, ff = false, shake = 0, rollT = 0;
  let aiStage = 0, aiT = 0, aiPlan: Plan | null = null, aiFrom = 0, aiPow0 = 0.5, aiX0 = 0;
  let dragMode: '' | 'aim' | 'power' | 'slide' = '', lastAng = 0, heldS = 0, heldA = 0;
  const parts: Part[] = [], floats: Float[] = [];
  let matchClock = RAPID_TIME, shotClock = 0, overT = 0, pendingV: Verdict | null = null;
  const expr: [Expr, Expr] = ['normal', 'normal'], exprT: [number, number] = [0, 0];
  let tut: { step: number; t0: { aim: number; power: number; x: number }; flags: Record<string, boolean>; arrowT: number; slideT: number; done: boolean } | null = null;
  let lastToastTurn = -1, finished = false;
  let ctxRef!: CanvasRenderingContext2D;
  const strikerDef = () => strikerById(save.striker), gripDef = () => gripById(save.grip), powderDef = () => powderById(save.powder);
  const human = () => !m.game.cur.ai;
  const dirOf = () => (m.game.turn === 0 ? 1 : -1); // which way the current shooter flicks (+y for the bottom player)
  const toast = (s: string, col = '#ffffff') => { toasts.push({ text: s, t: 0, col }); if (toasts.length > 3) toasts.shift(); };
  const say = (b: Omit<Banner, 't'>) => { banner = { ...b, t: 0 }; };
  const sx = (x: number) => x * S, sy = (y: number) => -y * S; // board space (centre of the playing surface)
  const toWorld = (px: number, py: number): [number, number] => [(px - tx) / S, (ty - py) / S];
  const halfW = () => FW * S;

  /* ------------------------------------------------------------ layout */
  function layout() {
    S = boardScaleFor(); tx = Math.round((X0() + X1()) / 2); ty = Math.round(Y0() + (view.h - view.sb - Y0()) / 2);
    art = boardArt(LOCS[cfg.loc].id, LOCS[cfg.loc].board, S, pocketScale(cfg.loc));
  }
  const colW = () => Math.max(56, (X1() - X0() - 2 * halfW()) / 2);
  const colL = () => X0() + colW() / 2, colR = () => X1() - colW() / 2;

  /* ------------------------------------------------------------ setup */
  function begin(c: PlayCfg) {
    cfg = c; const L = LOCS[c.loc], breaker = c.breaker ?? 0;
    m = new Match(c.mode, L.board.pockets, [false, c.kind !== 'tutorial'], breaker);
    skill = clamp(charById(c.opp).skill + (c.skillBoost ?? 0), 0.05, 0.99); aiStriker = STRIKERS[clamp(Math.round(skill * 7), 0, 7)]; if (c.auto) m.game.players[0].ai = true;
    armed = []; trayOpen = paused = showRules = confirmQuit = showOpts = false; power = 0.5; banner = null; toasts.length = 0; parts.length = 0; floats.length = 0;
    matchClock = RAPID_TIME; shotClock = shotClockOf(c.mode); shake = 0; ff = false; expr[0] = expr[1] = 'normal'; lastToastTurn = -1; overT = 0; pendingV = null; finished = false;
    layout();
    if (c.kind === 'tutorial') { tut = { step: 0, t0: { aim: 0, power: 0.5, x: 0 }, flags: {}, arrowT: 0, slideT: 0, done: false }; tutLayout(); } else tut = null;
    const first = m.game.turn;
    say({ text: c.kind === 'tutorial' ? 'COACH PEPPER' : modeById(c.mode).name, sub: c.kind === 'tutorial' ? 'LEARN THE GAME' : first === 0 ? 'YOU START' : `${shortName(charById(c.opp))} STARTS`, tone: 'gold', dur: 1.4 });
    phase = 'intro'; phaseT = 0; startMusic('game'); sfx('turn');
  }
  function tutLayout() {
    const s = m.sim, mk = (id: number, x: number, y: number) => { const c = s.coins.find((q) => q.id === id)!; c.x = x; c.y = y; c.state = 0; c.vx = c.vy = 0; };
    s.coins = s.coins.filter((b) => b.id === 0 || b.id === 1 || b.id === 2 || b.id === 10 || b.id === QUEEN);
    mk(1, 0.1, 0.12); mk(2, -0.15, 0.04); mk(10, 0.0, 0.2); mk(QUEEN, 0.2, -0.06);
    m.game.ids = [1, 2, 10, QUEEN]; m.game.down.clear(); m.placeStriker(0); aim = Math.PI / 2;
  }

  /* ------------------------------------------------------------ turns */
  function initAim() {
    const g = m.game, st = m.striker; power = 0.5; trayOpen = false; flickPull = 0.02;
    const ts = g.goals().map((id) => m.sim.coins.find((b) => b.id === id)!).filter((b) => b && b.state === 0);
    if (ts.length) { ts.sort((a, b) => Math.hypot(a.x - st.x, a.y - st.y) - Math.hypot(b.x - st.x, b.y - st.y)); aim = Math.atan2(ts[0].y - st.y, ts[0].x - st.x); } else aim = dirOf() * Math.PI / 2;
    clampAim(); shotClock = shotClockOf(cfg.mode);
  }
  function clampAim() { const d = dirOf(); if (d > 0) aim = clamp(aim, 0.12, Math.PI - 0.12); else aim = clamp(aim, -Math.PI + 0.12, -0.12); }
  function beginTurn(announce: boolean) {
    const g = m.game, p = g.cur; if (announce && g.turn !== lastToastTurn && cfg.kind !== 'tutorial') { toast(p.ai ? `${shortName(charById(cfg.opp))}'S TURN` : 'YOUR TURN', p.ai ? '#ffb0a0' : '#ffe0a0'); sfx('turn'); }
    lastToastTurn = g.turn; shotClock = shotClockOf(cfg.mode); aiStage = 0; aiT = 0; aiPlan = null;
    m.placeStriker(m.striker.x);
    if (p.ai) { phase = 'aiWait'; aim = dirOf() * Math.PI / 2; } else { phase = 'aim'; initAim(); }
    phaseT = 0;
  }

  function fire(plan?: { angle: number; speed: number }) {
    const g = m.game; let angle = aim, speed = 0; const mods: { magnet?: number; sticky?: boolean; glide?: number } = {};
    const ch = charById(g.turn === 0 ? cfg.player : cfg.opp);
    if (plan) { angle = plan.angle; speed = plan.speed; mods.glide = 1 / (1 + 0.01 * (ch.spin - 3)); }
    else {
      const steady = armed.includes('steady');
      speed = powerToSpeed(power, strikerDef().power * (1 + 0.012 * (ch.power - 3)) * (armed.includes('thunder') ? 1.25 : 1));
      if (!steady) angle += gauss() * ((0.34 * (0.3 + power) * (1 - gripDef().control * 0.85) * (1 - 0.03 * (ch.control - 3))) * Math.PI) / 180;
      if (armed.includes('magnet')) mods.magnet = 1.5; if (armed.includes('sticky')) mods.sticky = true;
      mods.glide = (1 / powderDef().glide) * (armed.includes('glide') ? 0.71 : 1) / (1 + 0.01 * (ch.spin - 3));
      for (const a of armed) if (a !== 'rewind' && powerCount(a) > 0) { save.powers[a] = Math.max(0, save.powers[a] - 1); }
      persist(); armed = armed.filter((a) => a === 'rewind');
    }
    m.snapshot(); m.fire({ angle, speed }, mods);
    sfx('cue', clamp(speed / 6.5, 0, 1));
    phase = 'roll'; rollT = 0; ff = !!cfg.auto; trayOpen = false; phaseT = 0; flickPull = 0;
  }
  function startShotAnim() {
    if (!m.canPlace(m.striker.x) && human()) { toast('A COIN IS IN THE WAY', '#ffb0a0'); sfx('error'); return; }
    phase = 'shot'; shotT = 0; trayOpen = false; sfx('tap');
  }

  function processEvents() {
    const evs = m.sim.events;
    for (const e of evs) {
      if (e.k === 'strike') sfx('clack', e.v / 2); else if (e.k === 'hit') sfx('clack', e.v / 2);
      else if (e.k === 'rim') sfx('rail', e.v / 2);
      else if (e.k === 'pocket') {
        sfx('pocket', e.v); vibrate(14);
        for (let i = 0; i < 12; i++) { const a = Math.random() * TAU, sp = 18 + Math.random() * 40; parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 0.6 + Math.random() * 0.4, c: ['#ffffff', COL.mint, COL.gold][i % 3], s: 0.8 + Math.random() }); }
        if (e.id === 0) floats.push({ x: e.x, y: e.y, text: 'FOUL', col: '#ff9a8a', t: 0 });
        else if (!(tut && tut.step < 6)) floats.push({ x: e.x, y: e.y, text: cfg.mode === 'free' || cfg.mode === 'rapid' ? `+${e.id === QUEEN ? 50 : e.id <= 9 ? 20 : 10}` : '+1', col: '#ffffff', t: 0 });
        if (tut && e.id !== 0) tut.flags.potted = true;
      }
    }
    evs.length = 0;
  }

  function endRoll() {
    if (tut) { // tutorial: no rules; reset the layout when the board is empty or the striker was lost
      const s = m.sim; for (const b of s.coins) if (b.id && b.state === 2) m.game.down.add(b.id);
      if (m.game.live().length === 0) { tutLayout(); toast('NEW COINS', '#ffe0a0'); }
      m.placeStriker(m.striker.x); tut!.flags.shot = true; phase = 'aim'; phaseT = 0; initAim(); return;
    }
    const wasTurn = m.game.turn; const v = m.settle(); pendingV = v;
    if (armed.includes('rewind') && wasTurn === 0 && (v.foul || !v.keep) && !(v.win === 0)) {
      armed = armed.filter((a) => a !== 'rewind'); if (powerCount('rewind') > 0) { save.powers.rewind--; persist(); }
      m.restore(); toast('REWIND!', '#9ab0ff'); sfx('power'); pendingV = null; phase = 'aim'; phaseT = 0; initAim(); return;
    }
    if (v.foul) { sfx('foul'); expr[wasTurn] = 'sad'; exprT[wasTurn] = 2; expr[1 - wasTurn] = 'happy'; exprT[1 - wasTurn] = 2; }
    else if (v.keep && v.potted.length) { expr[wasTurn] = 'happy'; exprT[wasTurn] = 1.6; sfx('turn'); }
    if (v.win >= 0) { phase = 'over'; overT = 0; say({ text: v.win === 0 ? 'YOU WON' : 'YOU LOST', sub: v.reason, tone: v.win === 0 ? 'gold' : 'bad', dur: 99 }); sfx(v.win === 0 ? 'win' : 'lose'); expr[0] = v.win === 0 ? 'cheer' : 'sad'; expr[1] = v.win === 0 ? 'sad' : 'cheer'; exprT[0] = exprT[1] = 99; return; }
    if (v.msg) say({ text: v.msg, sub: v.sub, tone: v.tone === 'bad' ? 'bad' : v.tone === 'good' ? 'good' : 'info', dur: v.foul ? 1.7 : 1.3 });
    if (v.reRack) toast('NEW RACK!', '#ffd23a'); else if (v.respot.length) toast(`${v.respot.length > 1 ? v.respot.length + ' COINS' : 'A COIN'} BACK ON THE BOARD`, '#ffd23a');
    phase = 'verdict'; phaseT = 0;
  }

  /* the result screen is entered through a fade, and this scene keeps updating during it: finish the match only once or the rewards are paid every frame */
  function finishGame() { if (finished) return; finished = true; const s = finishMatch(cfg, m.game); grabFrame(ctxRef.canvas); go('result', s); }

  /* ------------------------------------------------------------ pointer helpers */
  const strikerScreen = (): [number, number] => [tx + sx(m.striker.x), ty + sy(m.striker.y)];
  const inBoard = (x: number, y: number) => Math.abs(x - tx) <= halfW() && Math.abs(y - ty) <= halfW();
  const overUI = (x: number, y: number) => !inBoard(x, y) || inRect(x, y, X0() + 2, Y0() + 2, 26, 22) || (trayOpen && inRect(x, y, X1() - 250, view.h - view.sb - 110, 250, 110));

  /* ------------------------------------------------------------ update */
  function update(dt: number) {
    t += dt; phaseT += dt; if (shake > 0) shake = Math.max(0, shake - dt);
    if (banner && phase !== 'over') { banner.t += dt; if (banner.t > banner.dur) banner = null; } else if (banner) banner.t = Math.min(banner.t + dt, 0.5);
    for (const f of floats) f.t += dt; while (floats.length && floats[0].t > 1.2) floats.shift();
    for (const p of parts) { p.t += dt; p.x += (p.vx * dt) / S; p.y -= (p.vy * dt) / S; p.vy += 90 * dt; } while (parts.length && parts[0].t > parts[0].life) parts.shift();
    for (const q of toasts) q.t += dt; while (toasts.length && toasts[0].t > 2.2) toasts.shift();
    for (let i = 0; i < 2; i++) if (exprT[i] > 0 && exprT[i] < 50) { exprT[i] -= dt; if (exprT[i] <= 0) expr[i] = 'normal'; }
    if (paused) return;
    const g = m.game;
    if (cfg.mode === 'rapid' && !tut && phase !== 'over' && phase !== 'intro' && phase !== 'verdict') {
      matchClock -= dt * (ff ? 3.5 : 1);
      if (matchClock <= 0) { matchClock = 0; const w = g.timeUp(); if (w >= 0) { phase = 'over'; overT = 0; say({ text: w === 0 ? 'YOU WON' : 'YOU LOST', sub: 'TIME UP', tone: w === 0 ? 'gold' : 'bad', dur: 99 }); sfx(w === 0 ? 'win' : 'lose'); expr[0] = w === 0 ? 'cheer' : 'sad'; expr[1] = w === 0 ? 'sad' : 'cheer'; exprT[0] = exprT[1] = 99; return; } else { toast('SUDDEN DEATH!', '#ffd23a'); matchClock = 0.001; } }
    }
    switch (phase) {
      case 'intro': if (phaseT > 1.35) beginTurn(false); break;
      case 'aim': updateAim(dt); break;
      case 'aiWait': updateAi(dt); break;
      case 'shot': {
        shotT += dt; const T0 = 0.22, k = shotT / T0, base = 0.03 + power * 0.1;
        flickPull = k < 0.6 ? lerp(base, base + 0.045, k / 0.6) : lerp(base + 0.045, -0.01, (k - 0.6) / 0.4);
        if (shotT >= T0) { if (m.game.cur.ai && aiPlan) fire({ angle: aim, speed: aiPlan.speed }); else fire(); }
        break;
      }
      case 'roll': {
        rollT += dt; const step = Math.min(dt, 1 / 30) * (ff ? 3.5 : 1); advance(m.sim, step); processEvents();
        if (m.sim.calm > 0.3 && isSettled(m.sim)) endRoll();
        else if (rollT > 40) { for (const b of m.sim.coins) { b.vx = b.vy = 0; } endRoll(); }
        break;
      }
      case 'verdict': if (phaseT > (pendingV?.foul ? 1.7 : pendingV?.msg ? 1.2 : 0.35)) { pendingV = null; beginTurn(true); } break;
      case 'over': overT += dt; if (overT > 2.6 || (overT > 0.8 && ptr.pressed)) finishGame(); break;
    }
    if (shake > 0 && phase !== 'roll') shake = 0;
    if (tut) updateTut(dt);
  }

  const aimRate = (h: number) => (2 + 60 * Math.pow(clamp((h - 0.25) / 1.5, 0, 1), 2)) * (Math.PI / 180); // rad / s
  const slideRate = (h: number) => 0.05 + 0.4 * Math.pow(clamp((h - 0.2) / 1.3, 0, 1), 2); // m / s
  function updateAim(dt: number) {
    const g = m.game; const sc = shotClockOf(cfg.mode);
    if (sc && !tut) { shotClock -= dt; if (shotClock <= 0) { const v = g.shotClockOut(); m.apply(v); say({ text: v.msg, sub: v.sub, tone: 'bad', dur: 1.5 }); sfx('foul'); pendingV = v; phase = 'verdict'; phaseT = 0; return; } }
    if (!human() || paused) return;
    flickPull = 0.03 + power * 0.1;
    const st = m.striker, [cx, cy] = strikerScreen(), fine = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 0.25 : 1, B = layoutBar();
    const on = (b: Btn) => ptr.down && inRect(ptr.sx, ptr.sy, b.x - b.r - 4, b.y - b.r - 4, b.r * 2 + 8, b.r * 2 + 8);
    // left arrows (or A / D): slide the striker along the baseline
    const ds = on(B.slideL) ? -1 : on(B.slideR) ? 1 : keys.has('KeyA') ? -1 : keys.has('KeyD') ? 1 : 0;
    if (ds) { heldS += dt; m.placeStriker(st.x + ds * slideRate(heldS) * dt * fine); if (tut) tut.slideT += dt; } else heldS = 0;
    // right arrows (or the arrow keys): turn the aim
    const hl = on(B.aimL), hr = on(B.aimR), da = hl ? 1 : hr ? -1 : keys.has('ArrowLeft') ? 1 : keys.has('ArrowRight') ? -1 : 0;
    if (da) { heldA += dt; aim += da * aimRate(heldA) * dt * fine; if (tut) tut.arrowT += dt; } else heldA = 0;
    if (keys.has('ArrowUp')) power = clamp(power + dt * 0.5 * fine, 0, 1); if (keys.has('ArrowDown')) power = clamp(power - dt * 0.5 * fine, 0, 1);
    if (keyPressed.has('Space') || keyPressed.has('Enter')) startShotAnim();
    // pointer on the board: drag the striker to slide it, anywhere else to aim
    if (ptr.pressed && !overUI(ptr.x, ptr.y) && !trayOpen) {
      if (Math.hypot(ptr.x - cx, ptr.y - cy) < SR * S * 1.7 && Math.abs(ptr.y - cy) < SR * S * 2) dragMode = 'slide'; else { dragMode = 'aim'; lastAng = Math.atan2(cy - ptr.y, ptr.x - cx); }
    } else if (ptr.pressed && trayOpen && !overUI(ptr.x, ptr.y)) trayOpen = false;
    if (ptr.down && dragMode === 'slide') { const [wx] = toWorld(ptr.x, ptr.y); if (Math.abs(wx - st.x) > 1e-4) { m.placeStriker(wx); if (tut) tut.slideT += dt * 3; } }
    if (ptr.down && dragMode === 'aim') {
      const dist = Math.hypot(ptr.x - cx, ptr.y - cy);
      if (dist > 10) { const a = Math.atan2(cy - ptr.y, ptr.x - cx); if (ptr.dragged) { const k = clamp(80 / dist, 0.16, 1), d = angDiff(a, lastAng) * k; if (Math.abs(d) > 1e-5) { aim += d; if (tut && Math.abs(angDiff(aim, tut.t0.aim)) > 0.07) tut.flags.aimed = true; } } lastAng = a; }
    }
    if (ptr.released && dragMode === 'aim' && !ptr.dragged && !overUI(ptr.sx, ptr.sy) && Math.hypot(ptr.x - cx, ptr.y - cy) > 12) { aim = Math.atan2(cy - ptr.y, ptr.x - cx); if (tut) tut.flags.aimed = tut.flags.aimed || Math.abs(angDiff(aim, tut.t0.aim)) > 0.07; }
    if (!ptr.down && dragMode !== 'power') dragMode = '';
    clampAim();
  }

  /* ---- the computer's turn */
  function updateAi(dt: number) {
    const g = m.game; aiT += dt;
    if (aiStage === 0) { if (aiT > 0.5) { aiStage = 1; aiT = 0; } }
    else if (aiStage === 1) {
      if (aiT > 0.15) {
        aiPlan = planShot(g, m.sim, g.turn === 0 ? clamp(charById(cfg.player).skill + 0.1, 0.05, 0.99) : clamp(skill + [-0.2, 0, 0.1][save.opts.difficulty], 0.05, 0.99));
        aiFrom = aim; aiPow0 = power; aiX0 = m.striker.x; aiStage = 2; aiT = 0;
      }
    } else if (aiStage === 2 && aiPlan) {
      const T0 = 1.0, k = clamp(aiT / T0, 0, 1), e = k * k * (3 - 2 * k);
      m.placeStriker(lerp(aiX0, aiPlan.x, clamp(k * 2, 0, 1)));
      const a = aiFrom + angDiff(aiPlan.angle, aiFrom) * e; aim = a; const tp = speedToPower(aiPlan.speed, 1); power = lerp(aiPow0, tp, clamp((k - 0.4) / 0.6, 0, 1)); flickPull = 0.03 + power * 0.1;
      if (k >= 1) { aim = aiPlan.angle; m.placeStriker(aiPlan.x); startShotAnim(); }
    }
  }

  /* ---- tutorial progress */
  function updateTut(dt: number) {
    const tu = tut!; if (tu.done) return; const st = TUT[tu.step]; void dt;
    const f = tu.flags; let ok = false;
    switch (st.focus) {
      case 'slide': ok = tu.slideT > 0.5 || Math.abs(m.striker.x - tu.t0.x) > 0.06; break; case 'aim': ok = !!f.aimed; break; case 'arrows': ok = tu.arrowT > 0.7; break;
      case 'power': ok = Math.abs(power - tu.t0.power) > 0.15; break; case 'bolt': ok = !!f.trayOpened; break; case 'pot': ok = !!f.potted; break;
    }
    if (st.kind === 'do' && ok) tutNext();
  }
  function tutNext() { const tu = tut!; tu.step++; tu.flags = { ...tu.flags, aimed: false, potted: false, trayOpened: false }; tu.arrowT = 0; tu.slideT = 0; tu.t0 = { aim, power, x: m.striker.x }; sfx('lock'); if (tu.step >= TUT.length) tu.done = true; }

  /* ------------------------------------------------------------ drawing: HUD */
  function tallyRow(ctx: CanvasRenderingContext2D, p: number, cx: number, y: number) {
    const g = m.game; if (!g.colored()) return;
    const ids = g.ids.filter((i) => i !== QUEEN && g.mine(i, p)), r = 3, step = 7.4, perRow = Math.max(3, Math.floor((colW() - 8) / step)), rows = Math.ceil(ids.length / perRow);
    ids.forEach((id, i) => { const row = Math.floor(i / perRow), inRow = Math.min(perRow, ids.length - row * perRow), x = cx - (inRow * step) / 2 + step / 2 + (i % perRow) * step; ctx.save(); ctx.globalAlpha = g.down.has(id) ? 0.25 : 1; drawCoinIcon(ctx, cfg.mode, id, x, y + row * 7.6 + 3, r); ctx.restore(); });
    void rows;
  }
  function playerBlock(ctx: CanvasRenderingContext2D, p: number, cx: number, y0: number) {
    const g = m.game, pl = g.players[p], id = p === 0 ? cfg.player : cfg.opp, active = g.turn === p && phase !== 'over', ch = charById(id), w = colW(), sz = Math.round(clamp(w - 20, 26, 36));
    ctx.drawImage(avatar(id, sz, expr[p], active ? COL.gold : '#a8845a'), Math.round(cx - sz / 2), y0);
    const nm = shortName(ch); text(ctx, nm, cx, y0 + sz + 1, { align: 'c', color: active ? '#ffe27a' : '#ffffff', outline: '#2a1608', scale: Math.min(1, (w - 4) / Math.max(1, textWidth(nm))) });
    let y = y0 + sz + 11;
    if (g.id === 'knock') { text(ctx, `${pl.score} PTS`, cx, y, { align: 'c', color: '#ffd23a', outline: '#3a2000' }); y += 10; }
    else if (!g.colored() || g.id === 'queen') { const lbl = g.id === 'sprint' ? `${pl.score}/4` : g.id === 'queen' ? '' : `${pl.score} PTS`; if (lbl) { text(ctx, lbl, cx, y, { align: 'c', color: '#ffd23a', outline: '#3a2000' }); y += 10; } }
    tallyRow(ctx, p, cx, y);
  }
  function infoBlock(ctx: CanvasRenderingContext2D, cx: number, y0: number) {
    const g = m.game, mode = modeById(cfg.mode), w = colW() - 4, lines: [string, string][] = [];
    for (const ln of wrap(mode.name, w)) lines.push([ln, '#ffe0a8']);
    const tg = TARGETS[g.id]; if (tg) lines.push([`FIRST TO ${tg}`, '#d8b890']);
    if (g.id === 'duel') { lines.push(['FIRST TO 12', '#d8b890']); lines.push([`POINTS ${g.players[0].score}-${g.players[1].score}`, '#ffd23a']); }
    if (g.id === 'knock') { lines.push(['SHOTS LEFT', '#d8b890']); lines.push([`${g.players[0].lives}-${g.players[1].lives}`, '#ffd23a']); }
    if (g.id === 'target') { const nt = g.goals()[0]; if (nt !== undefined) lines.push([`HIT ${nt} FIRST`, '#ffd23a']); }
    if (g.id === 'classic' || g.id === 'duel' || g.id === 'queen') { const q = g.pendingCover >= 0 ? 'COVER THE QUEEN!' : g.queenBy >= 0 ? 'QUEEN COVERED' : 'QUEEN IN PLAY'; lines.push([q, g.pendingCover >= 0 ? '#ffd23a' : '#d8b890']); }
    let y = y0; for (const [s, c] of lines) { text(ctx, s, cx, y, { align: 'c', color: c, outline: '#2a1608', scale: Math.min(1, w / Math.max(1, textWidth(s))) }); y += 9.5; }
    const sc = shotClockOf(cfg.mode);
    if (cfg.mode === 'rapid') { const mm = Math.floor(matchClock / 60), ss = Math.floor(matchClock % 60); y += 2; text(ctx, `${mm}:${String(ss).padStart(2, '0')}`, cx, y, { align: 'c', scale: 1.2, bold: true, color: matchClock < 20 ? '#ff8a7a' : '#ffffff', outline: '#2a1608' }); y += 13; }
    if (sc && (phase === 'aim' || phase === 'aiWait')) { const f = clamp(shotClock / sc, 0, 1), bw = w - 8; fillRR(ctx, cx - bw / 2, y + 1, bw, 3.4, '#1a0e06', 1.5); fillRR(ctx, cx - bw / 2, y + 1, Math.max(2, bw * f), 3.4, f < 0.3 ? '#ff5a4a' : '#ffc040', 1.5); y += 8; }
    if (g.extra) text(ctx, 'EXTRA SHOT', cx, y, { align: 'c', color: '#ff9a8a', outline: null });
    if (g.suddenDeath) text(ctx, 'SUDDEN DEATH', cx, y, { align: 'c', color: '#ff9a8a', outline: null });
  }

  /* ------------------------------------------------------------ drawing: the board */
  function drawBoard(ctx: CanvasRenderingContext2D) {
    const L = LOCS[cfg.loc];
    ctx.save(); if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 5, (Math.random() - 0.5) * shake * 5);
    ctx.translate(tx, ty); ctx.drawImage(art.cv, -art.ox, -art.oy);
    const cs = m.sim.coins, sd = strikerDef(), isAi = m.game.cur.ai, stk = isAi ? aiStriker : sd;
    for (const c of cs) { if (c.state === 2) continue; drawShadow(ctx, sx(c.x), sy(c.y), c.r * S, c.state === 1 ? 0.18 : 0.32); }
    // target mode / queen hints
    if ((phase === 'aim' || phase === 'aiWait') && (cfg.mode === 'target' || m.game.pendingCover >= 0)) {
      const nt = cfg.mode === 'target' ? m.game.goals()[0] : QUEEN, nb = nt === undefined ? undefined : cs.find((b) => b.id === nt && b.state === 0);
      if (nb) { const pu = 0.5 + 0.5 * Math.sin(t * 6), rr = nb.r * S * (1.5 + pu * 0.25); ctx.save(); ctx.strokeStyle = `rgba(255,226,90,${0.55 + pu * 0.45})`; ctx.lineWidth = 1.6; ctx.setLineDash([3, 2.5]); ctx.beginPath(); ctx.arc(sx(nb.x), sy(nb.y), rr, 0, 7); ctx.stroke(); ctx.restore(); }
    }
    for (const c of cs) { // falling coins first, then live ones, the striker last
      if (c.state !== 1 || c.id === 0) continue; const f = clamp(c.fallT / 0.28, 0, 1); drawCoin(ctx, lookOf(cfg.mode, c.id), sx(c.x), sy(c.y), c.r * S, { alpha: 1 - f * 0.9, k: 1 - 0.5 * f, rot: c.rot });
    }
    for (const c of cs) if (c.state === 0 && c.id !== 0) drawCoin(ctx, lookOf(cfg.mode, c.id), sx(c.x), sy(c.y), c.r * S, { rot: c.rot });
    const st = m.striker;
    if (st.state === 1) { const f = clamp(st.fallT / 0.28, 0, 1); drawCoin(ctx, lookOf(cfg.mode, 0), sx(st.x), sy(st.y), st.r * S, { striker: stk, alpha: 1 - f * 0.9, k: 1 - 0.5 * f }); }
    else if (st.state === 0) {
      const aiming = phase === 'aim' || phase === 'shot' || (phase === 'aiWait' && aiStage === 2), blocked = phase === 'aim' && human() && !m.canPlace(st.x);
      if (aiming) guide(ctx);
      drawCoin(ctx, lookOf(cfg.mode, 0), sx(st.x), sy(st.y), st.r * S, { striker: stk, rot: st.rot });
      if (blocked) { ctx.strokeStyle = '#ff6a5a'; ctx.lineWidth = 1.4; ctx.setLineDash([2.5, 2.5]); ctx.beginPath(); ctx.arc(sx(st.x), sy(st.y), st.r * S + 2.5, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      if (aiming) drawFinger(ctx);
      else if (phase === 'aim' && human() && (!tut || tut.step >= 1)) { // slide hint: little chevrons beside the striker while it is idle
        const pu = 0.5 + 0.5 * Math.sin(t * 4); ctx.save(); ctx.fillStyle = `rgba(255,236,170,${0.25 + pu * 0.3})`; for (const d of [-1, 1]) { const x = sx(st.x) + d * (st.r * S + 5 + pu * 1.5); ctx.beginPath(); ctx.moveTo(x + d * 3, sy(st.y)); ctx.lineTo(x - d * 1, sy(st.y) - 3); ctx.lineTo(x - d * 1, sy(st.y) + 3); ctx.closePath(); ctx.fill(); } ctx.restore();
      }
    }
    for (const p of parts) { ctx.globalAlpha = clamp(1 - p.t / p.life, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(sx(p.x) - p.s / 2, sy(p.y) - p.s / 2, p.s, p.s); } ctx.globalAlpha = 1;
    for (const f of floats) { const k = f.t / 1.2; text(ctx, f.text, sx(f.x), sy(f.y) - 10 - k * 14, { align: 'c', bold: true, color: f.col, outline: '#2a1608', alpha: clamp(1.6 - k * 1.6, 0, 1) }); }
    ctx.restore(); void L;
  }

  /** the aim guide: a dashed line to the first coin (with the ghost striker and the coin's path) or to the rim */
  function guide(ctx: CanvasRenderingContext2D) {
    const st = m.striker, g = m.game; if (st.state !== 0) return;
    const dx = Math.cos(aim), dy = Math.sin(aim), eagle = armed.includes('eagle') || cfg.kind === 'tutorial', ai = g.cur.ai;
    const lenM = ai ? 0.3 + skill * 0.6 : strikerDef().aim * (eagle ? 1.7 : 1) * (powderDef().glide > 1 ? 1 : 1);
    const hit = castRay(m.sim, st.x, st.y, dx, dy, SR, 0), start = SR * 1.05;
    ctx.save(); ctx.lineCap = 'round';
    const seg = (x0: number, y0: number, x1: number, y1: number, col: string, w = 0.9, dash = true, al = 0.9) => { ctx.strokeStyle = col; ctx.globalAlpha = al; ctx.lineWidth = w; if (dash) ctx.setLineDash([3, 2.4]); else ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(sx(x0), sy(y0)); ctx.lineTo(sx(x1), sy(y1)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; };
    const tHit = Math.min(hit.t, lenM);
    seg(st.x + dx * start, st.y + dy * start, st.x + dx * tHit, st.y + dy * tHit, '#ffffff', 1, true, 0.92);
    if (hit.hitId >= 0 && hit.t <= lenM) {
      const ob = m.sim.coins.find((b) => b.id === hit.hitId)!, gx = hit.gx, gy = hit.gy;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(sx(gx), sy(gy), SR * S, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      const nx = ob.x - gx, ny = ob.y - gy, nl = Math.hypot(nx, ny) || 1, ux = nx / nl, uy = ny / nl, oMax = Math.min(0.5, 0.12 + (lenM - hit.t) * 0.7) * (eagle ? 1.6 : 1), oh = castRay(m.sim, ob.x, ob.y, ux, uy, CR, [0, ob.id]), oLen = Math.min(oMax, oh.t);
      seg(ob.x + ux * CR * 0.4, ob.y + uy * CR * 0.4, ob.x + ux * oLen, ob.y + uy * oLen, '#ffe27a', 1.1, false, 0.95);
      const dot = dx * ux + dy * uy, tx2 = dx - dot * ux, ty2 = dy - dot * uy, tl = Math.hypot(tx2, ty2);
      if (tl > 0.05) seg(gx + (tx2 / tl) * SR * 1.05, gy + (ty2 / tl) * SR * 1.05, gx + (tx2 / tl) * (0.04 + 0.1 * tl), gy + (ty2 / tl) * (0.04 + 0.1 * tl), '#ffd8b0', 0.9, true, 0.8);
    } else if (hit.rail && hit.t <= lenM + 0.01) {
      const rx = dx - 2 * (dx * hit.nx + dy * hit.ny) * hit.nx, ry = dy - 2 * (dx * hit.nx + dy * hit.ny) * hit.ny, left = Math.min(0.4, Math.max(0.05, lenM - hit.t) * (eagle ? 1.2 : 0.5));
      seg(hit.gx, hit.gy, hit.gx + rx * left, hit.gy + ry * left, '#ffd8b0', 0.9, true, 0.7);
      if (eagle) { const h2 = castRay(m.sim, hit.gx, hit.gy, rx, ry, SR, 0); if (h2.hitId >= 0 && h2.t < left) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(sx(h2.gx), sy(h2.gy), SR * S, 0, 7); ctx.stroke(); } }
    }
    ctx.restore();
  }
  /** the fingertip that flicks the striker: behind it along the aim line, pulled back with the power */
  function drawFinger(ctx: CanvasRenderingContext2D) {
    const st = m.striker, g = m.game, ch = charById(g.turn === 0 ? cfg.player : cfg.opp), gap = SR + 0.008 + flickPull, tipx = sx(st.x) - Math.cos(aim) * gap * S, tipy = sy(st.y) + Math.sin(aim) * gap * S;
    const ang = Math.atan2(Math.sin(aim), -Math.cos(aim)), len = 0.2 * S, w = Math.max(5, 0.04 * S), skin = ch.look.skin;
    ctx.save(); ctx.translate(tipx, tipy); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(30,12,0,0.28)'; ctx.beginPath(); ctx.roundRect(1.2, 1.8, len, w, w / 2); ctx.fill();
    const gr = ctx.createLinearGradient(0, -w / 2, 0, w / 2); gr.addColorStop(0, skin); gr.addColorStop(1, shade2(skin));
    ctx.beginPath(); ctx.roundRect(0, -w / 2, len, w, w / 2); ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(40,16,4,0.7)'; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(w * 0.12, -w * 0.3, w * 0.8, w * 0.6, w * 0.25); ctx.fillStyle = 'rgba(255,236,230,0.85)'; ctx.fill(); ctx.strokeStyle = 'rgba(120,60,40,0.5)'; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.restore();
  }
  const shade2 = (c: string) => { const v = parseInt(c.slice(1), 16), k = 0.74; return `rgb(${Math.round(((v >> 16) & 255) * k)},${Math.round(((v >> 8) & 255) * k)},${Math.round((v & 255) * k)})`; };

  /* ---- controls: two columns beside the board */
  interface Btn { x: number; y: number; r: number }
  interface Pw { x: number; y: number; w: number; h: number }
  const layoutBar = () => {
    const Y1 = view.h - view.sb, cl = colL(), cr = colR(), rr = colW() < 62 ? 11 : 13, ay = Y1 - rr - 6;
    return {
      slideL: { x: cl - rr - 2, y: ay, r: rr }, slideR: { x: cl + rr + 2, y: ay, r: rr },
      aimL: { x: cr - rr - 2, y: ay, r: rr }, aimR: { x: cr + rr + 2, y: ay, r: rr },
      power: { x: cr - 25, y: Y0() + 72, w: 15, h: Math.max(70, ay - rr - 14 - (Y0() + 72)) } as Pw,
      shoot: { x: cr + 12, y: Math.min(Y0() + 140, ay - rr - 44), r: 15 } as Btn, bolt: { x: cr + 12, y: Math.min(Y0() + 100, ay - rr - 78), r: 10 } as Btn, Y1,
    };
  };
  function powerBar(ctx: CanvasRenderingContext2D, P: Pw, enabled: boolean) {
    const { x, y, w, h } = P, rad = w / 2;
    fillRRr(ctx, x - 1.5, y - 1.5, w + 3, h + 3, enabled ? '#ffd23a' : '#8a7a68', rad + 1.5); fillRRr(ctx, x, y, w, h, '#1a0e06', rad);
    const n = Math.round(h / 6.5), L = h - 4, sw = L / n, th = w - 4;
    for (let i = 0; i < n; i++) {
      const on = i / n < power, col = i < n * 0.5 ? '#ffd88a' : i < n * 0.8 ? '#ff9a2a' : '#ff4a3a', c0 = on ? col : '#3a2410';
      fillRR(ctx, x + 2, y + h - 2 - (i + 1) * sw + 1.2, th, sw - 1.2, c0, 1); if (on) fillRR(ctx, x + 2, y + h - 2 - (i + 1) * sw + 1.2, 2, sw - 1.2, 'rgba(255,255,255,0.4)', 0.8);
    }
    const kx = x + w / 2, ky = y + h - 2 - L * power, kr = 6.5;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 3; const g = ctx.createRadialGradient(kx - 2, ky - 2, 1, kx, ky, kr + 1); g.addColorStop(0, '#fff8c0'); g.addColorStop(0.6, '#ffd23a'); g.addColorStop(1, '#b8780a'); ctx.beginPath(); ctx.arc(kx, ky, kr, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#4a2c00'; ctx.stroke(); ctx.restore();
    text(ctx, `POWER ${Math.round(power * 100)}`, x + w / 2 + 6, y - 10, { align: 'c', color: '#ffe0a8', outline: '#2a1608' });
  }
  /* see-through arrow button: every colour carries its own alpha, so the board shows through */
  function glassBtn(ctx: CanvasRenderingContext2D, dir: -1 | 1, cx: number, cy: number, r: number, disabled: boolean) {
    const down = !disabled && holdingIn(cx - r, cy - r, r * 2, r * 2), k = disabled ? 0.5 : 1;
    ctx.save(); const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r); g.addColorStop(0, `rgba(255,226,150,${(down ? 0.55 : 0.34) * k})`); g.addColorStop(1, `rgba(220,140,40,${(down ? 0.4 : 0.18) * k})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = `rgba(255,222,130,${0.7 * k})`; ctx.stroke(); ctx.restore();
    const q = r * 0.42; ctx.fillStyle = `rgba(255,255,255,${0.95 * k})`; ctx.beginPath(); ctx.moveTo(cx + dir * q, cy); ctx.lineTo(cx - dir * q * 0.7, cy - q * 1.05); ctx.lineTo(cx - dir * q * 0.7, cy + q * 1.05); ctx.closePath(); ctx.fill();
  }
  function shootButton(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, enabled: boolean): boolean {
    const down = enabled && holdingIn(cx - r, cy - r, r * 2, r * 2), y = cy + (down ? 1 : 0);
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(cx, y + 2, r, 0, 7); ctx.fill(); ctx.shadowColor = enabled ? 'rgba(255,220,90,0.8)' : 'rgba(0,0,0,0)'; ctx.shadowBlur = enabled ? 6 + Math.sin(t * 5) * 2 : 0;
    const g = ctx.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, enabled ? '#ffe27a' : '#9a8a78'); g.addColorStop(1, enabled ? '#b8780a' : '#4a3c30'); ctx.beginPath(); ctx.arc(cx, y, r, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(cx, y, r - 2.4, 0, 7); ctx.fillStyle = enabled ? '#4a2810' : '#2a2018'; ctx.fill(); ctx.restore();
    drawCoin(ctx, lookOf('classic', 0), cx, y, r - 4.2, { striker: strikerDef() });
    return enabled && inRect(ptr.x, ptr.y, cx - r, cy - r, r * 2, r * 2) && ptr.released && !ptr.dragged && inRect(ptr.sx, ptr.sy, cx - r, cy - r, r * 2, r * 2);
  }
  function drawControls(ctx: CanvasRenderingContext2D) {
    const B = layoutBar(), can = phase === 'aim' && human() && !paused, P = B.power, dis = !can;
    // left: slide the striker
    glassBtn(ctx, -1, B.slideL.x, B.slideL.y, B.slideL.r, dis); glassBtn(ctx, 1, B.slideR.x, B.slideR.y, B.slideR.r, dis);
    text(ctx, 'SLIDE', colL(), B.slideL.y - B.slideL.r - 10, { align: 'c', color: '#ffe0a8', outline: '#2a1608' });
    // right: turn the aim
    glassBtn(ctx, -1, B.aimL.x, B.aimL.y, B.aimL.r, dis); glassBtn(ctx, 1, B.aimR.x, B.aimR.y, B.aimR.r, dis);
    text(ctx, 'AIM', colR(), B.aimL.y - B.aimL.r - 10, { align: 'c', color: '#ffe0a8', outline: '#2a1608' });
    powerBar(ctx, P, can);
    if (can) {
      if (ptr.pressed && inRect(ptr.x, ptr.y, P.x - 12, P.y - 8, P.w + 24, P.h + 16)) dragMode = 'power';
      if (dragMode === 'power' && ptr.down) power = clamp(1 - (ptr.y - P.y - 2) / (P.h - 4), 0, 1);
      if (!ptr.down && dragMode === 'power') dragMode = '';
    }
    if (roundBtn(ctx, 'bolt', B.bolt.x, B.bolt.y, B.bolt.r, 'gold', { disabled: !can })) { trayOpen = !trayOpen; if (tut && trayOpen) tut.flags.trayOpened = true; }
    if (armed.length) armed.forEach((a, i) => ctx.drawImage(powerIcon(powerById(a), 12), B.bolt.x - 6 + i * 12 - (armed.length - 1) * 6, B.bolt.y - B.bolt.r - 15));
    if (phase === 'roll' || (phase === 'aiWait' && aiStage === 2) || phase === 'shot') { if (phase === 'roll' && roundBtn(ctx, 'ff', B.shoot.x, B.shoot.y, B.shoot.r, ff ? 'lime' : 'gold')) ff = !ff; else if (phase !== 'roll') shootButton(ctx, B.shoot.x, B.shoot.y, B.shoot.r, false); }
    else if (shootButton(ctx, B.shoot.x, B.shoot.y, B.shoot.r, can)) startShotAnim();
    if (trayOpen) drawTray(ctx, B);
  }
  function drawTray(ctx: CanvasRenderingContext2D, B: ReturnType<typeof layoutBar>) {
    const owned = POWERS.filter((p) => powerCount(p.id) > 0), w = Math.max(120, owned.length * 28 + 12), x = Math.max(X0() + 4, B.bolt.x - 14 - w), y = B.bolt.y - 17;
    const onBolt = () => inRect(ptr.x, ptr.y, B.bolt.x - 14, B.bolt.y - 14, 28, 28);
    if (!owned.length) {
      const msg = wrap('NO POWER-UPS YET. BUY THEM IN THE SHOP.', 150), pw = 170, ph = msg.length * 10 + 14, px = Math.max(X0() + 4, B.bolt.x - 14 - pw), py = B.bolt.y - ph / 2;
      panel(ctx, px, py, pw, ph, { fill: '#4a2c14', line: COL.gold }); msg.forEach((ln, i) => text(ctx, ln, px + pw / 2, py + 7 + i * 10, { align: 'c', color: '#ffe27a', outline: '#3a2000' }));
      if (ptr.released && !ptr.dragged && !inRect(ptr.x, ptr.y, px, py, pw, ph) && !onBolt()) trayOpen = false; return;
    }
    panel(ctx, x, y, w, 34, { fill: '#4a2c14', line: COL.gold });
    owned.forEach((p, i) => {
      const ix = x + 8 + i * 28, on = armed.includes(p.id), ic = powerIcon(p, 24);
      if (on) { ctx.save(); ctx.shadowColor = p.col; ctx.shadowBlur = 8; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(ix + 12, y + 14, 13, 0, 7); ctx.stroke(); ctx.restore(); }
      ctx.drawImage(ic, ix, y + 2); fillRR(ctx, ix + 12, y + 20, 12, 10, '#2a1608', 3); text(ctx, String(powerCount(p.id)), ix + 18, y + 22, { align: 'c', outline: null });
      if (ptr.released && !ptr.dragged && inRect(ptr.x, ptr.y, ix - 2, y, 28, 34) && inRect(ptr.sx, ptr.sy, ix - 2, y, 28, 34)) usePower(p.id);
    });
    if (ptr.released && !ptr.dragged && !inRect(ptr.x, ptr.y, x, y, w, 34) && !onBolt()) trayOpen = false;
  }
  function usePower(id: PowerId) {
    if (id === 'protip') { const pl = planShot(m.game, m.sim, 1, Math.random, true); aim = pl.angle; m.placeStriker(pl.x); power = speedToPower(pl.speed, strikerDef().power); if (powerCount('protip') > 0) { save.powers.protip--; persist(); } sfx('power'); toast('PRO TIP!', '#ff9a2a'); trayOpen = false; return; }
    if (armed.includes(id)) { armed = armed.filter((a) => a !== id); sfx('back'); return; }
    if (armed.length >= 2) armed.shift(); armed.push(id); sfx('power');
  }

  /* ---- HUD: pause button, player columns, toasts */
  function roundBtnSquare(ctx: CanvasRenderingContext2D, x: number, y: number): boolean {
    const down = holdingIn(x, y, 24, 20); fillRR(ctx, x, y + (down ? 1 : 0), 24, 20, '#ffd23a', 4); const g = ctx.createLinearGradient(0, y, 0, y + 20); g.addColorStop(0, '#ffec8a'); g.addColorStop(1, '#c8800a'); fillRR(ctx, x + 1, y + 1 + (down ? 1 : 0), 22, 18, g, 3.4); fillRR(ctx, x + 2, y + 2 + (down ? 1 : 0), 20, 8, 'rgba(255,255,255,0.4)', 3);
    ctx.drawImage(iconCanvas('pause'), x + 12 - iconCanvas('pause').width / 2, y + 10 - iconCanvas('pause').height / 2 + (down ? 1 : 0));
    return ptr.released && !ptr.dragged && inRect(ptr.sx, ptr.sy, x, y, 24, 20) && inRect(ptr.x, ptr.y, x, y, 24, 20);
  }
  function drawHud(ctx: CanvasRenderingContext2D) {
    if (roundBtnSquare(ctx, X0() + 4, Y0() + 2)) { paused = true; sfx('click'); }
    playerBlock(ctx, 0, colL(), Y0() + 26); playerBlock(ctx, 1, colR(), Y0() + 4);
    infoBlock(ctx, colL(), Y0() + 96);
  }
  function drawToasts(ctx: CanvasRenderingContext2D) {
    toasts.forEach((q, i) => { const a = clamp(Math.min(q.t / 0.15, (2.2 - q.t) / 0.4), 0, 1), w = textWidth(q.text) + 20, y = ty - halfW() + 2 + i * 0; ctx.save(); ctx.globalAlpha = a; if (i === toasts.length - 1) { pill(ctx, tx - w / 2, y + 1, w, 14, '#2a1608', q.col); text(ctx, q.text, tx, y + 4.5, { align: 'c', color: q.col, outline: '#2a1608' }); } ctx.restore(); });
  }

  function drawTutorial(ctx: CanvasRenderingContext2D) {
    const tu = tut!; if (tu.step >= TUT.length) return; const st = TUT[tu.step], B = layoutBar();
    const w = Math.min(view.w - 24, 330), x = (view.w - w) / 2, lines = wrap(st.text, w - 62), h = Math.max(36, lines.length * 10 + 16), y = ty + halfW() * 0.2;
    ctx.save(); ctx.globalAlpha = 0.95; panel(ctx, x, y, w, h, { fill: '#5a3418', line: COL.gold }); ctx.restore();
    ctx.drawImage(avatar('coach', 34, 'happy', COL.gold), x + 6, y + (h - 34) / 2);
    lines.forEach((ln, i) => text(ctx, ln, x + 46, y + 6 + i * 10, { color: '#ffffff', outline: '#2a1608' }));
    text(ctx, `${tu.step + 1} / ${TUT.length}`, x + w - 6, y + h - 11, { align: 'r', color: '#d8b890', outline: null });
    const pulse = 0.5 + 0.5 * Math.sin(t * 6), ring = (cx: number, cy: number, r: number) => { ctx.save(); ctx.strokeStyle = `rgba(255,226,90,${0.5 + pulse * 0.5})`; ctx.lineWidth = 2; ctx.shadowColor = '#ffd23a'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(cx, cy, r + pulse * 2, 0, 7); ctx.stroke(); ctx.restore(); };
    const f = st.focus;
    if (f === 'slide') { ring(B.slideL.x, B.slideL.y, B.slideL.r); ring(B.slideR.x, B.slideR.y, B.slideR.r); } else if (f === 'arrows') { ring(B.aimL.x, B.aimL.y, B.aimL.r); ring(B.aimR.x, B.aimR.y, B.aimR.r); }
    else if (f === 'power') { ctx.save(); ctx.strokeStyle = `rgba(255,226,90,${0.5 + pulse * 0.5})`; ctx.lineWidth = 2; ctx.strokeRect(B.power.x - 5, B.power.y - 5, B.power.w + 10, B.power.h + 10); ctx.restore(); }
    else if (f === 'bolt') ring(B.bolt.x, B.bolt.y, B.bolt.r + 3); else if (f === 'pot') ring(B.shoot.x, B.shoot.y, B.shoot.r + 3);
    if (st.kind === 'next') { const last = tu.step === TUT.length - 1; if (capsule(ctx, last ? 'FINISH' : 'NEXT', x + w - 40, y + h + 4, 70, 16, last ? 'gold' : 'green')) { if (last) tutFinish(); else tutNext(); } }
    else if (capsule(ctx, 'SKIP', x + w - 28, y + h + 4, 48, 14, 'dark')) tutNext();
  }
  function tutFinish() { if (!save.seen.tutorial) { save.seen.tutorial = true; addCoins(100); } persist(); go('hub', { from: 'tutorial' }); }

  /* ---- overlays: pause, rules */
  function drawPause(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(20,8,0,0.8)'; ctx.fillRect(0, 0, view.w, view.h); const cx = view.w / 2;
    if (showOpts) {
      const w = Math.min(300, view.w - 30), h = SETTINGS_ROWS * ROW_H + 62, x = cx - w / 2, y = (view.h - h) / 2; panel(ctx, x, y, w, h, { fill: '#4a2c14', line: COL.mint });
      text(ctx, 'OPTIONS', cx, y + 9, { align: 'c', bold: true, color: '#ffffff', outline: '#2a1608' }); settingsBody(ctx, x + 16, y + 24, w - 32);
      if (capsule(ctx, 'BACK', cx, y + h - 24, 100, 18, 'dark')) showOpts = false; return;
    }
    const w = 220, h = showRules ? 160 : 158, x = cx - w / 2, y = (view.h - h) / 2;
    panel(ctx, x, y, w, h, { fill: '#4a2c14', line: COL.mint }); text(ctx, showRules ? modeById(cfg.mode).name : 'PAUSED', cx, y + 9, { align: 'c', scale: 1, bold: true, color: '#ffffff', outline: '#2a1608' });
    if (showRules) { const lines = wrap(modeById(cfg.mode).desc, w - 24); lines.forEach((ln, i) => text(ctx, ln, cx, y + 28 + i * 10.5, { align: 'c', color: '#ffffff', outline: '#2a1608' })); if (capsule(ctx, 'BACK', cx, y + h - 28, 90, 18, 'dark')) showRules = false; return; }
    if (confirmQuit) { text(ctx, cfg.kind === 'career' || cfg.kind === 'tournament' ? 'QUIT AND LOSE THIS GAME?' : 'QUIT THE MATCH?', cx, y + 40, { align: 'c', color: '#ffb0a0', outline: '#2a1608' }); if (capsule(ctx, 'KEEP PLAYING', cx, y + 64, 130, 18, 'green')) confirmQuit = false; if (capsule(ctx, 'QUIT', cx, y + 92, 130, 18, 'red')) quit(); return; }
    let by = y + 28; const next = () => { const r = by; by += 24; return r; };
    if (capsule(ctx, 'RESUME', cx, next(), 140, 19, 'green')) paused = false;
    if (capsule(ctx, 'HOW TO PLAY', cx, next(), 140, 19, 'teal')) showRules = true;
    if (capsule(ctx, 'OPTIONS', cx, next(), 140, 19, 'teal')) showOpts = true;
    if (cfg.kind === 'quick' && capsule(ctx, 'RESTART', cx, next(), 140, 19, 'dark')) begin(cfg);
    if (capsule(ctx, 'QUIT', cx, next(), 140, 19, 'red')) { if (cfg.kind === 'tutorial' || cfg.kind === 'quick') quit(); else confirmQuit = true; }
  }
  function quit() {
    if (cfg.kind === 'career') { m.game.forfeit(0); go('hall', { loc: cfg.career?.loc ?? cfg.loc }); }
    else if (cfg.kind === 'tournament') go('tournament', { forfeit: true }); else if (cfg.kind === 'tutorial') go('hub'); else go('title');
  }

  function draw(ctx: CanvasRenderingContext2D) {
    ctxRef = ctx; layout();
    if ((import.meta as any).env?.DEV) (window as any).__pd = { S, tx, ty, w: view.w, phase, aim, power, turn: m.game.turn, striker: [m.striker.x, m.striker.y], down: [...m.game.down], coins: m.sim.coins.map((c) => [c.id, +c.x.toFixed(3), +c.y.toFixed(3), c.state]), score: m.game.players.map((p) => p.score), armed: [...armed] };
    ctx.drawImage(floorArt(cfg.loc), 0, 0);
    drawBoard(ctx);
    drawHud(ctx); drawControls(ctx); drawToasts(ctx);
    if (tut) drawTutorial(ctx);
    if (phase === 'over') { const k = clamp(overT / 0.35, 0, 1), bh = 74 * (1 - Math.pow(1 - k, 3)), win = m.game.winner === 0, col = win ? '#ffd23a' : '#ff6a5a'; ctx.fillStyle = 'rgba(30,12,0,0.66)'; ctx.fillRect(0, ty - bh / 2, view.w, bh); ctx.fillStyle = col; ctx.fillRect(0, ty - bh / 2 - 1.2, view.w, 2); ctx.fillRect(0, ty + bh / 2 - 0.8, view.w, 2); }
    if (banner && (phase !== 'over' || overT > 0.15)) bigBanner(ctx, banner, tx, ty, 340);
    if (paused) drawPause(ctx);
  }

  return {
    enter(c: PlayCfg) { begin(c); },
    update,
    draw,
    leave() { },
    back() { if (showOpts) { showOpts = false; return true; } if (showRules) { showRules = false; return true; } paused = !paused; if (!paused) confirmQuit = false; return true; },
    blur() { if (phase !== 'over' && phase !== 'intro') paused = true; },
  };
}
void BASE_X;
