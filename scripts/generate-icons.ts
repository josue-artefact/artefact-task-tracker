/**
 * Script único para generar los íconos PWA a partir del logo de Artefact.
 * Corre con: npx tsx scripts/generate-icons.ts
 *
 * Genera:
 *   public/icon-192.png
 *   public/icon-512.png
 *   public/icon-maskable-512.png  (con padding para iOS)
 *   public/apple-touch-icon.png   (180x180)
 *   public/favicon.png            (32x32)
 */

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const OUT = join(process.cwd(), "public");

const SVG_LOGO = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0A0907" rx="0"/>
  <g fill="#FDFBF7" font-family="DM Serif Display, Iowan Old Style, Georgia, serif" font-style="italic" font-weight="400" text-anchor="middle">
    <text x="256" y="240" font-size="118" letter-spacing="-3">Artefact</text>
    <text x="256" y="340" font-size="100" letter-spacing="-2.5">studio.</text>
  </g>
</svg>
`;

// Versión maskable: el logo dentro de un padding de 10% para iOS safe area.
const SVG_MASKABLE = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0A0907"/>
  <g fill="#FDFBF7" font-family="DM Serif Display, Iowan Old Style, Georgia, serif" font-style="italic" font-weight="400" text-anchor="middle" transform="translate(0, 10)">
    <text x="256" y="240" font-size="100" letter-spacing="-2.5">Artefact</text>
    <text x="256" y="330" font-size="84" letter-spacing="-2">studio.</text>
  </g>
</svg>
`;

async function main() {
  await mkdir(OUT, { recursive: true });

  const logoBuffer = Buffer.from(SVG_LOGO);
  const maskableBuffer = Buffer.from(SVG_MASKABLE);

  console.log("Generando íconos PWA…");

  await sharp(logoBuffer).resize(192, 192).png().toFile(join(OUT, "icon-192.png"));
  console.log("  ✓ icon-192.png");

  await sharp(logoBuffer).resize(512, 512).png().toFile(join(OUT, "icon-512.png"));
  console.log("  ✓ icon-512.png");

  await sharp(maskableBuffer).resize(512, 512).png().toFile(join(OUT, "icon-maskable-512.png"));
  console.log("  ✓ icon-maskable-512.png");

  await sharp(logoBuffer).resize(180, 180).png().toFile(join(OUT, "apple-touch-icon.png"));
  console.log("  ✓ apple-touch-icon.png");

  await sharp(logoBuffer).resize(32, 32).png().toFile(join(OUT, "favicon.png"));
  console.log("  ✓ favicon.png");

  console.log("Listo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
