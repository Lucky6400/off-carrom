/* Off Carrom entry: stage sizing (fixed 240 logical height, width follows the screen), landscape handling, main loop, scene wiring. */
import '@fontsource/bungee/400.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import './gfx/hires.js';
import { clearTextCache } from './gfx/font.js';
import { clearHallCache } from './gfx/halls.js';
import { clearBoardCache } from './gfx/board.js';
import { H, MIN_W, MAX_W, view, setView } from './config.js';
import { appHeight, safeLeft, safeRight, safeTop, safeBottom, isTouch } from './viewport.js';
import { attach, updateInput, endFrame, ptr } from './input.js';
import { unlock, applyVolumes, setAudioActive } from './audio.js';
import { go, update, draw, current, register } from './scenes/manager.js';
import { registerAll, firstScene } from './scenes/index.js';
import { initAds } from './admob.js';

export function start(canvas: HTMLCanvasElement, wrap: HTMLElement) {
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  try { Promise.all(['400 16px Bungee', '600 16px Rajdhani', '700 16px Rajdhani'].map((f) => document.fonts.load(f))).then(() => { clearTextCache(); clearHallCache(); clearBoardCache(); }).catch(() => {}); } catch { /* fallback fonts */ }

  /* The game is landscape. Natively the app is locked to landscape; in a browser, a touch device held in portrait gets the whole stage rotated 90 degrees
     (pointer positions are rotated back below), so it plays landscape even where the orientation cannot be locked (iOS Safari). */
  const lay = { rot: false, sw: 1, sh: 1, scale: 1, ox: 0, oy: 0, iw: 1 };
  let lw = 0, lh = 0;
  function resize() {
    const iw = window.innerWidth, ih = Math.max(window.innerHeight, appHeight()); lw = window.innerWidth; lh = window.innerHeight;
    const rot = isTouch() && ih > iw * 1.02 && !location.hash.includes('norot');
    const sw = rot ? ih : iw, sh = rot ? iw : ih;
    const l = rot ? 0 : safeLeft(), r = rot ? 0 : safeRight(), t = rot ? 0 : safeTop(), b = rot ? 0 : safeBottom();
    const fw = +((location.hash.match(/[#:]w=(\d+)/) || [])[1] || 0) /* #w=520 forces the logical width, for testing wide phones */, w = Math.max(MIN_W, Math.min(MAX_W, fw || Math.round((sw / sh) * H))), scale = Math.min(sw / w, sh / H), cw = w * scale, ch = H * scale, ox = (sw - cw) / 2, oy = (sh - ch) / 2;
    const rs = Math.max(2, Math.min(4, Math.ceil((window.devicePixelRatio || 1) * scale)));
    setView(w, rs, Math.max(0, (l - ox) / scale), Math.max(0, (r - ox) / scale), Math.max(0, (t - oy) / scale), Math.max(0, (b - oy) / scale));
    Object.assign(lay, { rot, sw, sh, scale, ox, oy, iw });
    wrap.style.width = sw + 'px'; wrap.style.height = sh + 'px'; wrap.style.transform = rot ? `translate(${iw}px,0) rotate(90deg)` : 'none';
    const pw = Math.round(w * rs), ph = H * rs;
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; }
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'; canvas.style.left = ox + 'px'; canvas.style.top = oy + 'px';
  }
  resize(); window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => { setTimeout(resize, 120); setTimeout(resize, 500); }); window.visualViewport?.addEventListener('resize', resize); setTimeout(resize, 300); setTimeout(resize, 1200);
  /* #vp in the URL shows the measured screen numbers (debugging phone layout) */
  if (location.hash.includes('vp')) { const o = document.createElement('pre'); o.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99;margin:0;padding:4px;background:rgba(0,0,0,.75);color:#0f0;font:10px monospace;pointer-events:none;white-space:pre'; document.body.appendChild(o); setInterval(() => { o.textContent = `inner ${innerWidth}x${innerHeight} app ${Math.round(appHeight())}\nrot ${lay.rot} stage ${lay.sw}x${lay.sh}\nscale ${lay.scale.toFixed(2)} view.w ${view.w} rs ${view.rs}\nsafe l${view.sl.toFixed(0)} r${view.sr.toFixed(0)} t${view.st.toFixed(0)} b${view.sb.toFixed(0)}`; }, 500); }

  const toGame = (e: PointerEvent): [number, number] => {
    const lx = lay.rot ? e.clientY : e.clientX, ly = lay.rot ? lay.iw - e.clientX : e.clientY;
    return [(lx - lay.ox) / lay.scale, (ly - lay.oy) / lay.scale];
  };
  attach(canvas, toGame, () => { unlock(); applyVolumes(); });
  /* landscape lock where the browser allows it (fullscreen / installed app) and fullscreen on the first touch */
  const lock = () => { try { const o = screen.orientation as ScreenOrientation & { lock?: (t: string) => Promise<void> }; void o.lock?.('landscape')?.catch(() => {}); } catch { /* unsupported */ } };
  lock();
  window.addEventListener('pointerdown', function first() { window.removeEventListener('pointerdown', first); if (!isTouch() || document.fullscreenElement) return; try { void document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).then(lock).catch(() => {}); } catch { /* ignore */ } });
  document.addEventListener('visibilitychange', () => { setAudioActive(!document.hidden); if (document.hidden) current()?.blur?.(); });
  window.addEventListener('keydown', (e) => { if (e.code === 'Escape') current()?.back?.(); });
  /* Android hardware back button inside the native app */
  if ((window as any).Capacitor?.isNativePlatform?.()) import('@capacitor/app').then(({ App }) => { void App.addListener('backButton', () => { if (!current()?.back?.()) void App.exitApp(); }); }).catch(() => {});

  registerAll(register);
  void initAds(); // consent + AdMob SDK + preload (native app only)
  const { name, params } = firstScene(location.hash.replace('#', ''));
  go(name, params, true);

  /* offline support: installed in production builds; the worker is network-first, so online players always get the latest deploy */
  if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });

  function render() {
    ctx.setTransform(view.rs, 0, 0, view.rs, 0, 0); ctx.imageSmoothingEnabled = true; ctx.fillStyle = '#120c06'; ctx.fillRect(0, 0, view.w, H);
    if ((window as any).__ovlOn) (window as any).__ovl = [];
    draw(ctx);
    const L = (window as any).__ovl as any[] | undefined; if (L) { const hits = (window as any).__ovlHits ??= new Set<string>(); for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (a.s === b.s && Math.abs(a.x0 - b.x0) < 0.5 && Math.abs(a.y0 - b.y0) < 0.5) continue; const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); if (ox > 1 && oy > 1.2) hits.add(`${a.s} <> ${b.s}`); } for (const a of L) if (a.x0 < -1 || a.x1 > view.w + 1 || a.y1 > view.h + 1) hits.add(`OFFSCREEN ${a.s}`); (window as any).__ovl = undefined; }
  }
  let last = performance.now(), insetTick = 0, lastInsets = '';
  function frame(now: number) {
    if ((window as any).__freeze) { last = now; requestAnimationFrame(frame); return; }
    /* system-bar / cutout insets change without any window resize (Android shows and hides the bars on touch), so re-measure them regularly and re-layout when they move */
    if (++insetTick % 15 === 0) { const s = `${safeLeft()}|${safeRight()}|${safeTop()}|${safeBottom()}`; if (s !== lastInsets) { lastInsets = s; resize(); } }
    if (window.innerWidth !== lw || window.innerHeight !== lh) resize();
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    updateInput(dt); update(dt);
    render();
    endFrame(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  (window as any).__op = { go, current, ptr, view, step: (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) { updateInput(dt); update(dt); render(); endFrame(); } } };
}
