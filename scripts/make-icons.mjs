/* Generates the PWA icons, favicon, social image and the Android launcher / splash art from one SVG (a striker and coins on a wooden carrom board).
   Run: node scripts/make-icons.mjs */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => join(root, ...a);
mkdirSync(P('public/icons'), { recursive: true });
mkdirSync(P('art-src'), { recursive: true });

const defs = `<defs>
  <radialGradient id="bg" cx="50%" cy="38%" r="80%"><stop offset="0" stop-color="#e8b870"/><stop offset="0.6" stop-color="#b87a3a"/><stop offset="1" stop-color="#4a2810"/></radialGradient>
  <radialGradient id="st" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="#fff4c8"/><stop offset="0.5" stop-color="#ffc24a"/><stop offset="1" stop-color="#b8680a"/></radialGradient>
  <radialGradient id="wh" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d8c490"/></radialGradient>
  <radialGradient id="bl" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="#6a5a4e"/><stop offset="1" stop-color="#14100c"/></radialGradient>
  <radialGradient id="qn" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="#ff8a90"/><stop offset="1" stop-color="#a01224"/></radialGradient>
  <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16"/></filter>
</defs>`;
const coin = (x, y, r, g) => `<circle cx="${x + 3}" cy="${y + 9}" r="${r}" fill="#000" opacity="0.35"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})" stroke="#2a1608" stroke-width="5"/><circle cx="${x}" cy="${y}" r="${r * 0.7}" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${r * 0.4}" fill="none" stroke="#000" stroke-opacity="0.2" stroke-width="3"/>`;
const art = `
${coin(150, 170, 52, 'bl')}${coin(358, 168, 52, 'wh')}${coin(150, 372, 52, 'wh')}${coin(360, 360, 52, 'bl')}${coin(256, 120, 40, 'qn')}
<circle cx="256" cy="276" r="150" fill="#ffd070" opacity="0.4" filter="url(#glow)"/>
<circle cx="260" cy="288" r="140" fill="#000" opacity="0.35"/>
<circle cx="256" cy="268" r="140" fill="url(#st)" stroke="#5a2e06" stroke-width="8"/>
<circle cx="256" cy="268" r="104" fill="none" stroke="#7a3e08" stroke-opacity="0.7" stroke-width="8"/>
<g fill="#7a3e08" fill-opacity="0.75">${[0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="256" cy="${268 - 54}" rx="20" ry="40" transform="rotate(${i * 60} 256 268)"/>`).join('')}</g>
<circle cx="256" cy="268" r="16" fill="#5a2e06"/>
<ellipse cx="206" cy="196" rx="56" ry="26" transform="rotate(-35 206 196)" fill="#fff" opacity="0.5"/>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}
<rect width="512" height="512" fill="url(#bg)"/>
<g stroke="#2a1608" stroke-opacity="0.35" stroke-width="3" fill="none"><rect x="40" y="40" width="432" height="432" rx="18"/><circle cx="256" cy="268" r="190"/></g>
<g fill="#1a0e06">${[[44, 44], [468, 44], [44, 468], [468, 468]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="34"/>`).join('')}</g>
${art}
</svg>`;
const out = (size, file) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(P(file));
await Promise.all([out(512, 'public/icons/icon-512.png'), out(192, 'public/icons/icon-192.png'), out(180, 'public/icons/apple-touch-icon.png'), out(48, 'public/favicon-48.png'), out(1024, 'art-src/icon-1024.png')]);

/* transparent foreground (striker + coins) for Android adaptive icons and a wooden background layer */
const fgSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}<g transform="translate(256 256) scale(0.8) translate(-256 -256)">${art}</g></svg>`;
const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}<rect width="512" height="512" fill="url(#bg)"/></svg>`;
await sharp(Buffer.from(fgSvg)).resize(1024, 1024).png().toFile(P('art-src/icon-fg.png'));
await sharp(Buffer.from(bgSvg)).resize(1024, 1024).png().toFile(P('art-src/icon-bg.png'));
/* landscape splash: dark wood with the logo tile in the middle */
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="1536" viewBox="0 0 2732 1536"><defs><radialGradient id="g" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#6a3e18"/><stop offset="1" stop-color="#1a0e06"/></radialGradient></defs><rect width="2732" height="1536" fill="url(#g)"/></svg>`;
await sharp(Buffer.from(splash)).composite([{ input: await sharp(Buffer.from(svg)).resize(620, 620).png().toBuffer(), gravity: 'center' }]).png().toFile(P('art-src/splash.png'));
console.log('icons written');
