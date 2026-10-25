import { view } from '../config.js';
/* Tiny scene stack with a fade transition. Scenes draw in immediate mode (they read the pointer in draw), so a scene switch requested
   while drawing is deferred until the frame ends. */
export interface Scene {
  enter?(p?: any): void;
  update?(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  leave?(): void;
  /** hardware back / Escape; return true when handled */
  back?(): boolean;
  blur?(): void;
}
const reg = new Map<string, () => Scene>();
let cur: Scene | null = null, curName = '', pending: { name: string; p?: any; instant: boolean } | null = null, fade = 0, fadeDir = 0;
export const register = (name: string, f: () => Scene) => reg.set(name, f);
export const go = (name: string, p?: any, instant = false) => { pending = { name, p, instant }; };
export const current = () => cur;
export const currentName = () => curName;
export function update(dt: number) {
  if (pending && fadeDir === 0) { if (pending.instant || !cur) { swap(); } else { fadeDir = 1; } }
  if (fadeDir === 1) { fade += dt * 7; if (fade >= 1) { fade = 1; swap(); fadeDir = -1; } }
  else if (fadeDir === -1) { fade -= dt * 7; if (fade <= 0) { fade = 0; fadeDir = 0; } }
  cur?.update?.(dt);
}
function swap() {
  if (!pending) return; const f = reg.get(pending.name); if (!f) { pending = null; return; }
  cur?.leave?.(); cur = f(); curName = pending.name; const p = pending.p; pending = null; cur.enter?.(p);
  if (pending && (pending as { instant: boolean }).instant) swap(); /* a scene that redirects while entering skips its own fade */
}
export function draw(ctx: CanvasRenderingContext2D) {
  cur?.draw(ctx);
  if (fade > 0) { ctx.fillStyle = `rgba(13,8,3,${Math.min(1, fade)})`; ctx.fillRect(0, 0, view.w, view.h); }
}
export const transitioning = () => fadeDir !== 0 || pending !== null;
