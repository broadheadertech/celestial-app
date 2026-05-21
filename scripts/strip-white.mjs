// Convert the Dragon's Cave logo JPG into clean transparent PNGs.
//
//   node scripts/strip-white.mjs in.jpg out.png [whiteThreshold=240] [--dark] [--crop=top]
//
// - White background (all channels >= whiteThreshold) → transparent. 30-step soft edge fade.
// - --crop=top  Detects the gap between icon and the "DRAGON'S CAVE" text band at the bottom and
//               crops the image to just the icon. Then trims any remaining whitespace borders.
// - --dark      Inverts near-black pixels to near-white so the dark fish stays readable on dark
//               surfaces. Saturated colors (e.g. red) are left untouched.
import sharp from 'sharp';
import fs from 'fs';

const args = process.argv.slice(2);
const IN = args[0];
const OUT = args[1];
const WHITE_THRESHOLD = parseInt(
  (args.find((a) => /^\d+$/.test(a)) ?? '240'),
  10,
);
const DARK = args.includes('--dark');
const CROP_TOP = args.some((a) => a === '--crop=top');
const DARK_THRESHOLD = 90; // anything with all channels <= this is treated as "the dark element"

if (!IN || !OUT) {
  console.error('Usage: node strip-white.mjs <in> <out> [whiteThreshold] [--dark] [--crop=top]');
  process.exit(1);
}

// 1) Optional pre-crop: find the icon/text boundary and keep only the icon portion.
let cropBuffer = null;
if (CROP_TOP) {
  const probe = await sharp(IN).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = probe.info;
  const data = probe.data;
  const isMostlyWhiteRow = (y) => {
    let w = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (Math.min(data[i], data[i + 1], data[i + 2]) >= 245) w++;
    }
    return w / width;
  };
  let inContent = false;
  let whiteStreak = 0;
  let iconBottom = height;
  for (let y = 0; y < height; y++) {
    if (isMostlyWhiteRow(y) < 0.97) {
      inContent = true;
      whiteStreak = 0;
    } else if (inContent) {
      whiteStreak++;
      if (whiteStreak >= 30) {
        iconBottom = y - whiteStreak + 5;
        break;
      }
    }
  }
  const cropH = Math.min(iconBottom, height);
  console.log(`Cropping to top ${cropH}px (icon only)`);
  cropBuffer = await sharp(IN).extract({ left: 0, top: 0, width, height: cropH }).png().toBuffer();
}

// 2) Trim remaining white border so the icon sits centered without dead space.
const trimmed = await sharp(cropBuffer || IN)
  .trim({ background: { r: 255, g: 255, b: 255 }, threshold: 12 })
  .png()
  .toBuffer();

const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
console.log(`After trim: ${width}x${height} (${channels}ch)${DARK ? ' · DARK variant' : ''}`);

let knockedWhite = 0;
let invertedDark = 0;

for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  const minCh = Math.min(r, g, b);
  const maxCh = Math.max(r, g, b);

  if (minCh >= WHITE_THRESHOLD) {
    data[i + 3] = 0;
    knockedWhite++;
    continue;
  }
  if (minCh >= WHITE_THRESHOLD - 30) {
    const t = (minCh - (WHITE_THRESHOLD - 30)) / 30;
    data[i + 3] = Math.max(0, Math.round((1 - t) * 255));
  }

  if (DARK && maxCh <= DARK_THRESHOLD) {
    // Map [0..DARK_THRESHOLD] → [255..(255-DARK_THRESHOLD)] so the dark fish becomes light.
    data[i] = 255 - r;
    data[i + 1] = 255 - g;
    data[i + 2] = 255 - b;
    invertedDark++;
  }
}

console.log(`Knocked ${knockedWhite} white px${DARK ? `, inverted ${invertedDark} dark px` : ''}`);

await sharp(data, { raw: { width, height, channels } })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(`Wrote ${OUT} (${fs.statSync(OUT).size} bytes, ${width}x${height})`);
