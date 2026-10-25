export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;

/** small deterministic rng */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  const next = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return Object.assign(next, { range: (a: number, b: number) => a + next() * (b - a), int: (a: number, b: number) => Math.floor(a + next() * (b - a + 1)), pick: <T,>(arr: T[]) => arr[Math.floor(next() * arr.length)], chance: (p: number) => next() < p });
}
export type Rng = ReturnType<typeof rng>;
export const hash2 = (x: number, y: number) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const strSeed = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

export type RGB = [number, number, number];
export const hex = (s: string): RGB => { const v = parseInt(s.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
export const rgbStr = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
/** mix two #rrggbb strings, returns #rrggbb */
export function mixHex(a: string, b: string, t: number): string { const c = mixRGB(hex(a), hex(b), t); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); }
export const shade = (a: string, t: number) => (t >= 0 ? mixHex(a, '#ffffff', t) : mixHex(a, '#000000', -t));

export const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** like fmt, but past a million it shortens (1.2M, 3.4B) so a huge number never outgrows its box */
export const fmtC = (n: number) => { const a = Math.abs(n); if (a < 1e6) return fmt(n); const u = a >= 1e12 ? ['T', 1e12] : a >= 1e9 ? ['B', 1e9] : ['M', 1e6]; const v = n / (u[1] as number); return (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + (u[0] as string); };
