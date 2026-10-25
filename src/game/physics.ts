/* Carrom physics: pure TypeScript, no DOM (runs in the game, in the AI's look-ahead and in the headless tests).
   Frame: x to the right, y up the board (the player at the bottom shoots towards +y). Metres, seconds. The board is a square 0.74 m across with a pocket in every corner.
   Discs slide with Coulomb friction (constant deceleration), collide with mass-weighted impulses (the striker is heavier than a coin) and bounce off the wooden rim. */
export const HB = 0.37;                 // half the playing surface
export const CR = 0.0225;               // coin radius (a real coin is 15.9 mm, enlarged for the small screen)
export const SR = 0.0292;               // striker radius
export const M_COIN = 1, M_STRIKER = 2.7;
export const BASE_Y = 0.262;            // y of the baselines (+ for the top player)
export const BASE_X = 0.232;            // the striker may slide this far from the centre line
export const PK_IN = 0.016, PK_R = 0.041; // pocket centre inset from the corner, pocket mouth radius
const G = 9.81, MU = 0.205, E_COIN = 0.93, E_RIM = 0.74;
export const DT = 1 / 600;
export const V_MAX = 8;
/** power slider (0..1) to striker speed (m/s) and back */
export const powerToSpeed = (p: number, mul = 1) => (0.55 + Math.pow(Math.max(0, Math.min(1, p)), 1.25) * 5.9) * mul;
export const speedToPower = (v: number, mul = 1) => Math.pow(Math.max(0, Math.min(1, (v / mul - 0.55) / 5.9)), 1 / 1.25);

export interface PocketDef { x: number; y: number; r: number }
export interface Board { half: number; pockets: PocketDef[] }
export type CoinState = 0 | 1 | 2; // live, falling into a pocket, pocketed
export interface Coin { id: number; x: number; y: number; vx: number; vy: number; r: number; m: number; state: CoinState; pocket: number; fallT: number; rot: number }
export interface SimEvent { k: 'hit' | 'strike' | 'rim' | 'pocket'; v: number; id: number; id2?: number; x: number; y: number }
export interface ShotLog { firstContact: number; contacts: number; strikerRim: number; pocketed: { id: number; pocket: number; rim: boolean }[]; strikerPocketed: boolean; rimTouched: number[] }
export interface Sim { board: Board; coins: Coin[]; t: number; shot: ShotLog; events: SimEvent[]; magnet: number; sticky: boolean; glide: number; calm: number }
export interface ShotParams { angle: number; speed: number }

export const isStriker = (id: number) => id === 0;
export function makeBoard(pk = 1): Board {
  const c = HB - PK_IN, r = PK_R * pk;
  return { half: HB, pockets: [{ x: -c, y: c, r }, { x: c, y: c, r }, { x: -c, y: -c, r }, { x: c, y: -c, r }] };
}
export const newCoin = (id: number, x: number, y: number): Coin => ({ id, x, y, vx: 0, vy: 0, r: id === 0 ? SR : CR, m: id === 0 ? M_STRIKER : M_COIN, state: 0, pocket: -1, fallT: 0, rot: 0 });
const freshShot = (): ShotLog => ({ firstContact: -1, contacts: 0, strikerRim: 0, pocketed: [], strikerPocketed: false, rimTouched: [] });
export function newSim(board: Board, coins: Coin[]): Sim { return { board, coins, t: 0, shot: freshShot(), events: [], magnet: 1, sticky: false, glide: 1, calm: 0 }; }
export function cloneSim(s: Sim): Sim {
  return { board: s.board, coins: s.coins.map((c) => ({ ...c })), t: s.t, shot: { ...s.shot, pocketed: s.shot.pocketed.map((p) => ({ ...p })), rimTouched: [...s.shot.rimTouched] }, events: [], magnet: s.magnet, sticky: s.sticky, glide: s.glide, calm: s.calm };
}
export const striker = (s: Sim) => s.coins[0];
export const coinById = (s: Sim, id: number) => s.coins.find((c) => c.id === id);

/** flick the striker */
export function shoot(s: Sim, p: ShotParams) {
  if (!Number.isFinite(p.angle)) p = { ...p, angle: Math.PI / 2 }; if (!Number.isFinite(p.speed)) p = { ...p, speed: 2 };
  const b = striker(s), V = Math.min(V_MAX, Math.max(0.1, p.speed));
  s.shot = freshShot(); s.t = 0; s.calm = 0; b.vx = Math.cos(p.angle) * V; b.vy = Math.sin(p.angle) * V;
}

function moveCoin(c: Coin, dt: number, fr: number) {
  const v = Math.hypot(c.vx, c.vy); if (v === 0) return;
  const nv = v - MU * G * fr * dt - (v < 0.25 ? 0.5 * dt : 0);
  if (nv <= 0.012) { c.vx = 0; c.vy = 0; return; }
  const k = nv / v; c.vx *= k; c.vy *= k; c.x += c.vx * dt; c.y += c.vy * dt;
  c.rot += (c.vx * 0.9 - c.vy * 0.4) * dt * 4; // purely visual: the disc turns a little as it travels
}

function coinCoin(s: Sim, a: Coin, b: Coin) {
  const dx = b.x - a.x, dy = b.y - a.y, md = a.r + b.r, d2 = dx * dx + dy * dy;
  if (d2 >= md * md || d2 < 1e-12) return;
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, im = 1 / a.m + 1 / b.m, pen = (md - d) + 1e-5;
  a.x -= nx * pen * (1 / a.m) / im; a.y -= ny * pen * (1 / a.m) / im; b.x += nx * pen * (1 / b.m) / im; b.y += ny * pen * (1 / b.m) / im;
  const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (vn <= 0) return;
  const j = ((1 + E_COIN) * vn) / im;
  a.vx -= (j / a.m) * nx; a.vy -= (j / a.m) * ny; b.vx += (j / b.m) * nx; b.vy += (j / b.m) * ny;
  const st = a.id === 0 ? a : b.id === 0 ? b : null;
  if (st) { const o = st === a ? b : a; s.shot.contacts++; if (s.shot.firstContact < 0) { s.shot.firstContact = o.id; if (s.sticky) { st.vx = 0; st.vy = 0; s.sticky = false; } } }
  s.events.push({ k: st ? 'strike' : 'hit', v: vn, id: a.id, id2: b.id, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
}

function rim(s: Sim, c: Coin) {
  const lim = s.board.half - c.r; let hit = false, vn = 0;
  if (c.x > lim) { c.x = lim; if (c.vx > 0) { vn = c.vx; c.vx = -c.vx * E_RIM; c.vy *= 0.97; hit = true; } }
  else if (c.x < -lim) { c.x = -lim; if (c.vx < 0) { vn = -c.vx; c.vx = -c.vx * E_RIM; c.vy *= 0.97; hit = true; } }
  if (c.y > lim) { c.y = lim; if (c.vy > 0) { vn = c.vy; c.vy = -c.vy * E_RIM; c.vx *= 0.97; hit = true; } }
  else if (c.y < -lim) { c.y = -lim; if (c.vy < 0) { vn = -c.vy; c.vy = -c.vy * E_RIM; c.vx *= 0.97; hit = true; } }
  if (hit) {
    if (c.id === 0) s.shot.strikerRim++; else if (!s.shot.rimTouched.includes(c.id)) s.shot.rimTouched.push(c.id);
    if (vn > 0.05) s.events.push({ k: 'rim', v: vn, id: c.id, x: c.x, y: c.y });
  }
}

function pocketCheck(s: Sim, c: Coin) {
  const sp = Math.hypot(c.vx, c.vy);
  for (let i = 0; i < s.board.pockets.length; i++) {
    const p = s.board.pockets[i], dx = c.x - p.x, dy = c.y - p.y, rr = p.r * 0.92 * s.magnet;
    if (dx * dx + dy * dy < rr * rr) {
      if (sp > 6.5 && dx * dx + dy * dy > (rr * 0.55) ** 2) continue; // far too fast: skims over the edge
      c.state = 1; c.pocket = i; c.fallT = 0;
      s.shot.pocketed.push({ id: c.id, pocket: i, rim: s.shot.rimTouched.includes(c.id) }); if (c.id === 0) s.shot.strikerPocketed = true;
      s.events.push({ k: 'pocket', v: sp, id: c.id, x: p.x, y: p.y }); return;
    }
  }
}

/** advance one fixed step */
export function step(s: Sim, dt = DT) {
  s.t += dt;
  const cs = s.coins, fr = s.glide;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (c.state === 1) { // dropping into the pocket
      const p = s.board.pockets[c.pocket]; c.fallT += dt; c.x += (p.x - c.x) * Math.min(1, dt * 14); c.y += (p.y - c.y) * Math.min(1, dt * 14); c.vx *= 0.9; c.vy *= 0.9;
      if (c.fallT > 0.28) { c.state = 2; c.vx = c.vy = 0; } continue;
    }
    if (c.state === 0) moveCoin(c, dt, fr);
  }
  for (let it = 0; it < 2; it++) for (let i = 0; i < cs.length; i++) { const a = cs[i]; if (a.state !== 0) continue; for (let j = i + 1; j < cs.length; j++) { const b = cs[j]; if (b.state === 0) coinCoin(s, a, b); } }
  for (let i = 0; i < cs.length; i++) { const c = cs[i]; if (c.state === 0) { pocketCheck(s, c); if (c.state === 0) rim(s, c); } }
}

export function isSettled(s: Sim): boolean {
  for (const c of s.coins) { if (c.state === 1) return false; if (c.state === 0 && (c.vx !== 0 || c.vy !== 0)) return false; }
  return true;
}
/** run until everything stops (or maxT seconds): used by the AI */
export function runToRest(s: Sim, maxT = 14) {
  let n = 0; const limit = Math.ceil(maxT / DT);
  while (n++ < limit) { step(s); if ((n & 31) === 0) { s.events.length = 0; if (isSettled(s)) break; } }
  s.events.length = 0;
}
/** a fixed-step driver for the real-time game: advance `dt` seconds of simulated time */
export function advance(s: Sim, dt: number) {
  s.calm += dt; let left = dt; while (left > 1e-9) { const h = Math.min(DT, left); step(s, h); left -= h; }
  for (const c of s.coins) if (!(Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.vx) && Number.isFinite(c.vy))) { c.x = c.y = c.vx = c.vy = 0; if (c.id !== 0) c.state = 2; } // safety net: never let a NaN freeze a match
}

/* ---------------------------------------------------------------- aim geometry (guide line, AI) */
export interface Cast { t: number; hitId: number; gx: number; gy: number; rail: boolean; nx: number; ny: number }
/** ray of a disc of radius r from (ox, oy): first coin it touches, or the rim */
export function castRay(s: Sim, ox: number, oy: number, dx: number, dy: number, r = SR, skip: number | number[] = 0): Cast {
  const sk = Array.isArray(skip) ? skip : [skip];
  let best: Cast = { t: 1e9, hitId: -1, gx: 0, gy: 0, rail: false, nx: 0, ny: 0 };
  for (const b of s.coins) {
    if (sk.includes(b.id) || b.state !== 0) continue;
    const fx = ox - b.x, fy = oy - b.y, md = r + b.r, bb = fx * dx + fy * dy, cc = fx * fx + fy * fy - md * md, disc = bb * bb - cc;
    if (disc < 0) continue; const t = -bb - Math.sqrt(disc); if (t > 0 && t < best.t) best = { t, hitId: b.id, gx: ox + dx * t, gy: oy + dy * t, rail: false, nx: 0, ny: 0 };
  }
  const lim = s.board.half - r;
  const wall = (den: number, num: number, nx: number, ny: number) => { if (den === 0) return; const t = num / den; if (t > 0 && t < best.t) best = { t, hitId: -1, gx: ox + dx * t, gy: oy + dy * t, rail: true, nx, ny }; };
  if (dx > 1e-9) wall(dx, lim - ox, -1, 0); else if (dx < -1e-9) wall(dx, -lim - ox, 1, 0);
  if (dy > 1e-9) wall(dy, lim - oy, 0, -1); else if (dy < -1e-9) wall(dy, -lim - oy, 0, 1);
  return best;
}
/** is the straight lane a -> b free of coins (other than `ignore`) for a disc of radius r? */
export function laneClear(s: Sim, ax: number, ay: number, bx: number, by: number, r: number, ignore: number[]): boolean {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  for (const b of s.coins) {
    if (b.state !== 0 || ignore.includes(b.id)) continue;
    let t = ((b.x - ax) * dx + (b.y - ay) * dy) / l2; t = Math.max(0, Math.min(1, t));
    const px = ax + dx * t - b.x, py = ay + dy * t - b.y, md = (r + b.r) * 0.985; if (px * px + py * py < md * md) return false;
  }
  return true;
}
/** is there room for a disc of radius r at (x, y)? */
export const freeSpot = (s: Sim, x: number, y: number, r: number, ignore = -1, gap = 1.0) => s.coins.every((b) => b.id === ignore || b.state !== 0 || (b.x - x) ** 2 + (b.y - y) ** 2 >= ((r + b.r) * gap) ** 2);
