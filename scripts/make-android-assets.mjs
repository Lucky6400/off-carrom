// Cuts art-src/{icon-fg,icon-bg,splash}.png into the Android launcher icons and splash screens.
//   node scripts/make-android-assets.mjs
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import sharp from 'sharp'

const RES = 'android/app/src/main/res'
const fg = 'art-src/icon-fg.png'
const bg = 'art-src/icon-bg.png'
const splash = 'art-src/splash.png'

const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }

const out = (path) => {
  const dir = path.slice(0, path.lastIndexOf('/'))
  mkdirSync(dir, { recursive: true })
  return path
}

// legacy composite icon: background + medallion
async function composite(size) {
  const b = await sharp(bg).resize(size, size).png().toBuffer()
  const f = await sharp(fg).resize(size, size).png().toBuffer()
  return sharp(b).composite([{ input: f }]).png().toBuffer()
}

for (const [d, k] of Object.entries(DENS)) {
  const legacy = Math.round(48 * k)
  const adaptive = Math.round(108 * k)
  const dir = `${RES}/mipmap-${d}`
  const base = await composite(legacy)
  // rounded square for ic_launcher, circle for ic_launcher_round
  const rr = Buffer.from(`<svg width="${legacy}" height="${legacy}"><rect width="${legacy}" height="${legacy}" rx="${legacy * 0.18}" fill="#fff"/></svg>`)
  const circle = Buffer.from(`<svg width="${legacy}" height="${legacy}"><circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}" fill="#fff"/></svg>`)
  await sharp(base).composite([{ input: rr, blend: 'dest-in' }]).png().toFile(out(`${dir}/ic_launcher.png`))
  await sharp(base).composite([{ input: circle, blend: 'dest-in' }]).png().toFile(out(`${dir}/ic_launcher_round.png`))
  await sharp(fg).resize(adaptive, adaptive).png().toFile(out(`${dir}/ic_launcher_foreground.png`))
  await sharp(bg).resize(adaptive, adaptive).png().toFile(out(`${dir}/ic_launcher_background.png`))
}

// adaptive icon definitions use the PNG layers
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`
writeFileSync(out(`${RES}/mipmap-anydpi-v26/ic_launcher.xml`), adaptive)
writeFileSync(out(`${RES}/mipmap-anydpi-v26/ic_launcher_round.xml`), adaptive)
// the template's vector layers are replaced by the PNGs above
for (const f of [`${RES}/drawable-v24/ic_launcher_foreground.xml`, `${RES}/drawable/ic_launcher_background.xml`]) if (existsSync(f)) rmSync(f)

// splash screens (landscape app: the land-* set is what shows; port-* are cover crops for completeness)
const LAND = { mdpi: [480, 320], hdpi: [800, 480], xhdpi: [1280, 720], xxhdpi: [1600, 960], xxxhdpi: [1920, 1280] }
for (const [d, [w, h]] of Object.entries(LAND)) {
  await sharp(splash).resize(w, h, { fit: 'cover' }).png().toFile(out(`${RES}/drawable-land-${d}/splash.png`))
  await sharp(splash).resize(h, w, { fit: 'cover' }).png().toFile(out(`${RES}/drawable-port-${d}/splash.png`))
}
await sharp(splash).resize(1280, 720, { fit: 'cover' }).png().toFile(out(`${RES}/drawable/splash.png`))

// Android 12+ splash icon: the medallion on the dark launch background
await sharp(fg).resize(576, 576).png().toFile(out(`${RES}/drawable/splash_icon.png`))

console.log('android assets written')
