/* Screen metrics for the landscape game: real height (iOS home-screen apps can report a short one), safe-area insets, standalone detection. */
const probe = (css: string) => {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:0;top:0;width:1px;visibility:hidden;pointer-events:none;box-sizing:content-box;' + css;
  document.documentElement.appendChild(d);
  return d;
};
const dvh = probe('height:100dvh'), vh = probe('height:100vh');
const eTop = probe('height:0;padding-top:env(safe-area-inset-top, 0px)'), eBot = probe('height:0;padding-bottom:env(safe-area-inset-bottom, 0px)');
const eLeft = probe('height:0;padding-left:env(safe-area-inset-left, 0px)'), eRight = probe('height:0;padding-left:env(safe-area-inset-right, 0px)');

export function isStandalone() {
  const nav = navigator as unknown as { standalone?: boolean };
  return nav.standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
}
/** height that really reaches the bottom of the screen (standalone iOS apps can fall a few px short with innerHeight) */
export function appHeight() {
  let h = Math.max(window.innerHeight, parseFloat(getComputedStyle(dvh).height) || 0, window.visualViewport?.height ?? 0);
  if (isStandalone()) h = Math.max(h, parseFloat(getComputedStyle(vh).height) || 0);
  return h;
}
const fake = () => (location.hash.match(/inset=(\d+),(\d+),(\d+),(\d+)/) || []).slice(1).map(Number); // #inset=top,right,bottom,left simulates a notch on desktop
export const safeTop = () => fake()[0] ?? (eTop.offsetHeight || 0);
export const safeRight = () => fake()[1] ?? (parseFloat(getComputedStyle(eRight).paddingLeft) || 0);
export const safeBottom = () => fake()[2] ?? (eBot.offsetHeight || 0);
export const safeLeft = () => fake()[3] ?? (parseFloat(getComputedStyle(eLeft).paddingLeft) || 0);
export const isTouch = () => matchMedia('(pointer: coarse)').matches;
