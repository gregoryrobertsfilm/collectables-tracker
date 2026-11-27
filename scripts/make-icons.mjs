// Draws the app icon and saves it in every size phones and browsers ask for.
// Run with:  npm run icons
// Change the colours or shapes below, run it again, and every icon updates.

import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const ACCENT = '#3d3bd6'
const INK = '#ffffff'

/**
 * The mark: four tiles, like figures on a shelf.
 * `inset` shrinks the mark towards the centre; `rounded` gives the background rounded corners.
 * iPhone and Android round the corners themselves, so their versions are square and fully filled.
 */
function iconSvg({ rounded, inset }) {
  const s = 1 - inset * 2
  const tile = (x, y, opacity) =>
    `<rect x="${x}" y="${y}" width="15" height="15" rx="4" fill="${INK}" opacity="${opacity}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="${rounded ? 14 : 0}" fill="${ACCENT}"/>
  <g transform="translate(${64 * inset} ${64 * inset}) scale(${s})">
    ${tile(14, 14, 1)}${tile(35, 14, 0.55)}${tile(14, 35, 0.55)}${tile(35, 35, 1)}
  </g>
</svg>`
}

const outputs = [
  // [file, pixels, options]
  ['public/icons/apple-touch-icon.png', 180, { rounded: false, inset: 0.04 }],
  ['public/icons/icon-192.png', 192, { rounded: true, inset: 0 }],
  ['public/icons/icon-512.png', 512, { rounded: true, inset: 0 }],
  ['public/icons/icon-maskable-512.png', 512, { rounded: false, inset: 0.12 }],
  ['public/icons/favicon-32.png', 32, { rounded: true, inset: 0 }],
]

await mkdir('public/icons', { recursive: true })
await writeFile('public/favicon.svg', iconSvg({ rounded: true, inset: 0 }) + '\n')

for (const [file, size, options] of outputs) {
  await sharp(Buffer.from(iconSvg(options)), { density: 600 })
    .resize(size, size)
    // No transparency on the full-bleed icons: iPhone would paint transparent areas black.
    .flatten(options.rounded ? false : { background: ACCENT })
    .png()
    .toFile(file)
  console.log(`wrote ${file} (${size}x${size})`)
}
