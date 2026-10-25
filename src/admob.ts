/* AdMob glue shared by every Arcadoff game (copy of the Ashbreak logic without scene code).
   API:  initAds()                     call once at startup (consent + SDK + preload)
         adBreak(3)                    interstitial on every 3rd natural pause (never waits for a missing ad)
         adReady('rewarded')           true when a tap on "watch ad" starts an ad at once
         showInterstitial()            Promise<boolean>; never makes the player wait (no ad ready = false)
         showRewarded()                Promise<{ completed, reason? }>; waits up to 6 s for a loading ad
         adFailText(result)            short message for the player when a rewarded ad did not count
   Android uses the game's real units; web / iOS use Google's public TEST units. Nothing runs outside the native app. */
import { Capacitor } from '@capacitor/core'
import { AdMob } from '@capacitor-community/admob'
const AM: any = AdMob // the plugin's typed event overloads are too strict for this small wrapper

export type AdKind = 'interstitial' | 'rewarded'
export type AdFail = 'unavailable' | 'closed'
export interface RewardResult { completed: boolean; reason?: AdFail }

const UNITS = Capacitor.getPlatform() === 'android'
  ? { interstitial: 'ca-app-pub-3940256099942544/1033173712', rewarded: 'ca-app-pub-3940256099942544/5224354917' } // Google TEST units until Off Carrom has its own AdMob units
  : { interstitial: 'ca-app-pub-3940256099942544/1033173712', rewarded: 'ca-app-pub-3940256099942544/5224354917' }
const isNative = () => Capacitor.isNativePlatform()
const LOAD_WAIT_MS = 6000

interface Slot { ready: boolean; loading: boolean; fails: number; timer: any; waiters: Array<(ok: boolean) => void> }
const slots: Record<AdKind, Slot> = {
  interstitial: { ready: false, loading: false, fails: 0, timer: 0, waiters: [] },
  rewarded: { ready: false, loading: false, fails: 0, timer: 0, waiters: [] },
}
const EVENTS: Record<AdKind, { loaded: string; failed: string }> = {
  interstitial: { loaded: 'interstitialAdLoaded', failed: 'interstitialAdFailedToLoad' },
  rewarded: { loaded: 'onRewardedVideoAdLoaded', failed: 'onRewardedVideoAdFailedToLoad' },
}

function settle(kind: AdKind, ok: boolean) { const s = slots[kind]; const w = s.waiters; s.waiters = []; w.forEach((f) => f(ok)) }

/** asks AdMob for the next ad of this kind (no-op when one is ready or already loading) */
function load(kind: AdKind) {
  const s = slots[kind]
  if (s.ready || s.loading || !isNative()) return
  clearTimeout(s.timer); s.loading = true
  const opts = { adId: UNITS[kind] };
  (kind === 'interstitial' ? AM.prepareInterstitial(opts) : AM.prepareRewardVideoAd(opts)).then(() => onLoaded(kind), () => onFailed(kind))
}
/* the plugin reports a load twice (promise + event), so both handlers ignore the second report */
function onLoaded(kind: AdKind) { const s = slots[kind]; if (!s.loading) return; s.ready = true; s.loading = false; s.fails = 0; settle(kind, true) }
function onFailed(kind: AdKind) {
  const s = slots[kind]; if (!s.loading) return
  s.ready = false; s.loading = false; s.fails++; settle(kind, false)
  s.timer = setTimeout(() => load(kind), Math.min(60000, 5000 * 2 ** Math.min(s.fails, 4)))
}

let initP: Promise<void> | null = null
export function initAds(): Promise<void> {
  if (!isNative()) return Promise.resolve()
  if (initP) return initP
  initP = (async () => {
    try {
      const info = await AM.requestConsentInfo() // EU/UK consent (Google UMP): only shows a form where the law requires one
      if (info.isConsentFormAvailable && info.status === 'REQUIRED') await AM.showConsentForm()
    } catch { /* ads still work with non-personalised defaults */ }
    await AM.initialize({})
    for (const k of ['interstitial', 'rewarded'] as AdKind[]) {
      AM.addListener(EVENTS[k].loaded as any, () => onLoaded(k))
      AM.addListener(EVENTS[k].failed as any, () => onFailed(k))
      load(k)
    }
  })().catch(() => { initP = null })
  return initP
}

/** true when a "watch ad" tap starts an ad right away (always true outside the native app so the web build stays testable) */
export function adReady(kind: AdKind = 'rewarded'): boolean { return !isNative() || slots[kind].ready }

export function adFailText(r: RewardResult): string {
  if (r.completed) return ''
  return r.reason === 'closed' ? 'WATCH THE WHOLE AD TO EARN THE REWARD' : 'NO AD AVAILABLE RIGHT NOW - TRY AGAIN SOON'
}

function whenReady(kind: AdKind, ms: number): Promise<boolean> {
  const s = slots[kind]
  if (s.ready) return Promise.resolve(true)
  return new Promise((resolve) => {
    const t = setTimeout(() => { s.waiters = s.waiters.filter((f) => f !== fn); resolve(false) }, ms)
    const fn = (ok: boolean) => { clearTimeout(t); resolve(ok) }
    s.waiters.push(fn); load(kind)
  })
}

export async function showInterstitial(): Promise<boolean> {
  if (!isNative()) return false
  await initAds()
  const s = slots.interstitial
  if (!(await whenReady('interstitial', 0))) { load('interstitial'); return false }
  s.ready = false
  return new Promise((resolve) => {
    let h1: any, h2: any
    const end = (ok: boolean) => { h1 && h1.remove(); h2 && h2.remove(); load('interstitial'); resolve(ok) }
    Promise.all([
      AM.addListener('interstitialAdDismissed', () => end(true)).then((h: any) => { h1 = h }),
      AM.addListener('interstitialAdFailedToShow', () => end(false)).then((h: any) => { h2 = h }),
    ]).then(() => AM.showInterstitial()).catch(() => end(false))
  })
}

let breaks = 0
/** call at natural pauses (match over, level over); shows an interstitial on every `every`-th call, never waits for a missing ad */
export async function adBreak(every = 3): Promise<void> {
  breaks++
  if (breaks % every === 0) await showInterstitial()
}
export async function showRewarded(): Promise<RewardResult> {
  if (!isNative()) return { completed: true } // web build: pretend, so the flow can be tried in a browser
  await initAds()
  const s = slots.rewarded
  if (!(await whenReady('rewarded', LOAD_WAIT_MS))) { load('rewarded'); return { completed: false, reason: 'unavailable' } }
  s.ready = false
  return new Promise((resolve) => {
    let rewarded = false, h1: any, h2: any, h3: any
    const end = (r: RewardResult) => { h1 && h1.remove(); h2 && h2.remove(); h3 && h3.remove(); load('rewarded'); resolve(r) }
    Promise.all([
      AM.addListener('onRewardedVideoAdReward', () => { rewarded = true }).then((h: any) => { h1 = h }),
      AM.addListener('onRewardedVideoAdDismissed', () => end(rewarded ? { completed: true } : { completed: false, reason: 'closed' })).then((h: any) => { h2 = h }),
      AM.addListener('onRewardedVideoAdFailedToShow', () => end({ completed: false, reason: 'unavailable' })).then((h: any) => { h3 = h }),
    ]).then(() => AM.showRewardVideoAd()).catch(() => end({ completed: false, reason: 'unavailable' }))
  })
}
