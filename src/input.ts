/* Pointer state in logical coordinates. Scenes read it each frame (immediate-mode UI); endFrame() clears the one-frame flags.
   One pointer is tracked at a time (the first finger down wins). */
export const ptr = {
  x: -1, y: -1, down: false, pressed: false, released: false,
  sx: 0, sy: 0,            // where the press started
  px: 0, py: 0,            // previous position (for drag deltas)
  dx: 0, dy: 0,            // movement since last frame while down
  dragged: false,          // moved more than a tap
  t: 0,                    // seconds held
  swipe: 0,                // -1 / +1 on a horizontal swipe release, else 0
  id: -1,
};
export const keys = new Set<string>();
export const keyPressed = new Set<string>();
const cap = (e: PointerEvent) => e.pointerType !== 'mouse' || e.button === 0;

export function attach(canvas: HTMLCanvasElement, toGame: (e: PointerEvent) => [number, number], onGesture: () => void) {
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault(); if (!cap(e) || (ptr.down && ptr.id !== e.pointerId)) return;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const [x, y] = toGame(e); ptr.id = e.pointerId; ptr.x = ptr.sx = ptr.px = x; ptr.y = ptr.sy = ptr.py = y; ptr.down = true; ptr.pressed = true; ptr.dragged = false; ptr.t = 0; ptr.dx = 0; ptr.dy = 0; onGesture();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (ptr.down && ptr.id !== e.pointerId) return;
    const [x, y] = toGame(e); ptr.x = x; ptr.y = y; if (ptr.down && (Math.abs(x - ptr.sx) > 4 || Math.abs(y - ptr.sy) > 4)) ptr.dragged = true;
  });
  const up = (e: PointerEvent) => {
    if (!ptr.down || ptr.id !== e.pointerId) return; const [x, y] = toGame(e); ptr.x = x; ptr.y = y; ptr.down = false; ptr.released = true; ptr.id = -1;
    const dx = x - ptr.sx, dy = y - ptr.sy; ptr.swipe = Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) * 1.3 ? (dx < 0 ? 1 : -1) : 0;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  window.addEventListener('pointerup', up);
  window.addEventListener('keydown', (e) => { if (!keys.has(e.code)) keyPressed.add(e.code); keys.add(e.code); if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); onGesture(); });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); ptr.down = false; });
}
export function updateInput(dt: number) { if (ptr.down) { ptr.dx = ptr.x - ptr.px; ptr.dy = ptr.y - ptr.py; ptr.t += dt; } else { ptr.dx = 0; ptr.dy = 0; } ptr.px = ptr.x; ptr.py = ptr.y; }
export function endFrame() { ptr.pressed = false; ptr.released = false; ptr.swipe = 0; keyPressed.clear(); }

/** a pointer press that started and ended inside the rect and was not a drag */
export function clickedIn(x: number, y: number, w: number, h: number): boolean {
  return ptr.released && !ptr.dragged && inRect(ptr.sx, ptr.sy, x, y, w, h) && inRect(ptr.x, ptr.y, x, y, w, h);
}
export function holdingIn(x: number, y: number, w: number, h: number): boolean { return ptr.down && inRect(ptr.sx, ptr.sy, x, y, w, h) && inRect(ptr.x, ptr.y, x, y, w, h); }
export const inRect = (px: number, py: number, x: number, y: number, w: number, h: number) => px >= x && py >= y && px < x + w && py < y + h;
