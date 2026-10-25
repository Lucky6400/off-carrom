/* Local save (localStorage, guarded): wallet, xp / level, gear, characters, power-ups, career progress, stats, options. */
import { SAVE_KEY } from './config.js';
import { LOC_COUNT } from './data/locations.js';
import { SPECIALS, CAREER_GAMES, type GameId } from './data/modes.js';
import { xpForLevel, MAX_LEVEL, POWERS, type PowerId } from './data/items.js';

export interface Opts { music: number; sfx: number; vibrate: boolean; tutorial: boolean; difficulty: number /* 0 easy, 1 medium, 2 hard */ }
export interface Stats { games: number; wins: number; pots: number; bestStreak: number; trophies: number; scratches: number; breaks: number; played: Record<string, number> }
export interface SaveData {
  v: 1; coins: number; xp: number; level: number;
  chars: string[]; char: string; striker: string; grip: string; powder: string; strikers: string[]; grips: string[]; powders: string[];
  powers: Record<PowerId, number>;
  wins: Record<string, boolean[]>;          // career: location index -> [classic, free, duel, special] won
  claimed: boolean[];                       // location clear reward taken
  special: GameId[];                        // the random 4th game of each location
  loc: number;                              // location shown by the map
  stats: Stats; opts: Opts; seen: Record<string, boolean>;
}
const randSpecials = () => { const out: GameId[] = []; for (let i = 0; i < LOC_COUNT; i++) { let s: GameId; do { s = SPECIALS[Math.floor(Math.random() * SPECIALS.length)]; } while (i > 0 && s === out[i - 1]); out.push(s); } return out; };
const defaults = (): SaveData => ({
  v: 1, coins: 300, xp: 0, level: 1,
  chars: ['arjun', 'zara'], char: 'arjun', striker: 'bone', grip: 'none', powder: 'boric', strikers: ['bone'], grips: ['none'], powders: ['boric'],
  powers: Object.fromEntries(POWERS.map((p) => [p.id, 0])) as Record<PowerId, number>,
  wins: {}, claimed: Array(LOC_COUNT).fill(false), special: randSpecials(), loc: 0,
  stats: { games: 0, wins: 0, pots: 0, bestStreak: 0, trophies: 0, scratches: 0, breaks: 0, played: {} },
  opts: { music: 0.5, sfx: 0.8, vibrate: true, tutorial: true, difficulty: 1 }, seen: {},
});

function load(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { const d = JSON.parse(raw) as Partial<SaveData>, b = defaults(); return { ...b, ...d, powers: { ...b.powers, ...(d.powers ?? {}) }, stats: { ...b.stats, ...(d.stats ?? {}) }, opts: { ...b.opts, ...(d.opts ?? {}) }, wins: d.wins ?? {}, seen: d.seen ?? {}, special: d.special && d.special.length === LOC_COUNT ? d.special : b.special, claimed: d.claimed && d.claimed.length === LOC_COUNT ? d.claimed : b.claimed }; }
  } catch { /* storage unavailable or corrupt: defaults */ }
  return defaults();
}
export const save: SaveData = load();
export function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* ignore */ } }
export function resetSave() { Object.assign(save, defaults()); persist(); }
export const addCoins = (n: number) => { save.coins = Math.max(0, save.coins + Math.round(n)); persist(); };
export function addPower(id: PowerId, n: number) { save.powers[id] = Math.min(99, (save.powers[id] ?? 0) + n); persist(); }
export const powerCount = (id: PowerId) => save.powers[id] ?? 0;
/** add xp; returns how many levels were gained */
export function addXp(n: number): number {
  save.xp += Math.max(0, Math.round(n)); let gained = 0;
  while (save.level < MAX_LEVEL && save.xp >= xpForLevel(save.level)) { save.xp -= xpForLevel(save.level); save.level++; gained++; }
  if (save.level >= MAX_LEVEL) save.xp = Math.min(save.xp, xpForLevel(save.level) - 1);
  persist(); return gained;
}

/* ---- career ---- */
export const gameWon = (loc: number, g: number) => !!save.wins[loc]?.[g];
export function setGameWon(loc: number, g: number) { (save.wins[loc] ??= [false, false, false, false])[g] = true; persist(); }
export const gamesWon = (loc: number) => (save.wins[loc] ?? []).filter(Boolean).length;
export const locDone = (loc: number) => gamesWon(loc) >= 4;
/** highest location the player may enter */
export function unlockedLoc(): number { let l = 0; while (l < LOC_COUNT - 1 && locDone(l)) l++; return l; }
/** next game index to beat in a location (4 = all done) */
export function nextGame(loc: number): number { for (let i = 0; i < 4; i++) if (!gameWon(loc, i)) return i; return 4; }
export const careerGame = (loc: number, g: number): GameId => (g < 3 ? CAREER_GAMES[g] : save.special[loc]);
/** table / hall of a location is usable in quick match once its predecessor is cleared */
export const hallOpen = (loc: number) => loc === 0 || locDone(loc - 1);
