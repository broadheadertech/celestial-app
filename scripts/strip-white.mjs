// Knocks out the white background, optionally inverts dark→light for use on dark backgrounds.
//
//   node scripts/strip-white.mjs in.jpg out.png [whiteThreshold=240] [--dark]
//
// - White background pixels (all channels >= whiteThreshold) become fully transparent.
// - Soft 30-step fade just below the threshold smooths edges.
// - With --dark: pixels that are nearly black (all channels <= darkThreshold) are inverted to white
//   so the logo stays readable on dark surfaces. Mid-tone (e.g. red) pixels are left alone.
import sharp from 'sharp';
import fs from 'fs';

const args = process.argv.slice(2);
const IN = args[0];
const OUT = args[1];
const WHITE_THRESHOLD = parseInt(args[2] || '240', 10);
const DARK = args.includes('--dark');
const DARK_THRESHOLD = 60; // pixels with all channels <= this are considered "the dark element"

if (!IN || !OUT) {
  console.error('Usage: node strip-white.mjs <in> <out> [whiteThreshold=240] [--dark]');
  process.exit(1);
}

const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
console.log(`Loaded ${width}x${height} (${channels}ch)${DARK ? ' · DARK variant' : ''}`);

let knockedWhite = 0;
let invertedDark = 0;

for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  const minCh = Math.min(r, g, b);
  const maxCh = Math.max(r, g, b);

  // 1) White background → transparent (with soft fade for anti-aliased edges)
  if (minCh >= WHITE_THRESHOLD) {
    data[i + 3] = 0;
    knockedWhite++;
    continue;
  }
  if (minCh >= WHITE_THRESHOLD - 30) {
    const t = (minCh - (WHITE_THRESHOLD - 30)) / 30;
    data[i + 3] = Math.max(0, Math.round((1 - t) * 255));
  }

  // 2) Dark variant: invert near-black pixels to near-white so they read on dark surfaces.
  //    Only invert when r,g,b are all dark (i.e. a grey/black pixel, not a saturated red).
  if (DARK && maxCh <= DARK_THRESHOLD) {
    data[i] = 255 - r;
    data[i + 1] = 255 - g;
    data[i + 2] = 255 - b;
    invertedDark++;
  }
}

console.log(`Knocked ${knockedWhite} white px${DARK ? `, inverted ${invertedDark} dark px → light` : ''}`);

await sharp(data, { raw: { width, height, channels } })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(`Wrote ${OUT} (${fs.statSync(OUT).size} bytes)`);
