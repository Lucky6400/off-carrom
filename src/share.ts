/* Rate / share / legal links (Play Store + hosted policies). */
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

const PKG = 'com.arcadoff.offcarrom';
const STORE = `https://play.google.com/store/apps/details?id=${PKG}`;
const SITE = 'https://lucky6400.github.io/ashbreak-privacy/off-carrom';

export function rateApp() {
  if (Capacitor.isNativePlatform()) window.location.href = `market://details?id=${PKG}`;
  else window.open(STORE, '_blank');
}

export async function shareApp() {
  const data = { title: 'Off Carrom', text: 'Play Off Carrom, the arcade carrom game with career, tournaments and power-ups!', url: STORE };
  try {
    if (Capacitor.isNativePlatform()) await Share.share({ ...data, dialogTitle: 'Share Off Carrom' });
    else if (navigator.share) await navigator.share(data);
    else await navigator.clipboard.writeText(STORE);
  } catch { /* cancelled */ }
}

const openUrl = (u: string) => { if (Capacitor.isNativePlatform()) window.location.href = u; else window.open(u, '_blank'); };
export const openPrivacy = () => openUrl(`${SITE}.html`);
export const openTerms = () => openUrl(`${SITE}-terms.html`);
