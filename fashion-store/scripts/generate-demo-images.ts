/**
 * Generates original, license-free demo imagery (flat-lay garment illustrations)
 * into /public/demo. Run with: npm run demo:images
 * All artwork is produced procedurally — no third-party photography is used.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { DEMO_COLORS, GARMENT_TYPES, type GarmentType, imageName } from "../prisma/demo-data";

const OUT = path.join(process.cwd(), "public", "demo");
const W = 1200;
const H = 1500;

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) + amt);
  const g = clamp(((n >> 8) & 255) + amt);
  const b = clamp((n & 255) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 170;
}

// ───────────── Garment silhouettes (1200×1500 canvas) ─────────────

const TEE = "M520 300 Q600 372 680 300 L830 338 L975 540 L880 600 L820 505 L822 1150 Q600 1172 378 1150 L380 505 L320 600 L225 540 L370 338 Z";
const LONG_SLEEVE = "M520 300 Q600 372 680 300 L830 338 L1000 960 L915 985 L820 520 L822 1150 Q600 1172 378 1150 L380 520 L285 985 L200 960 L370 338 Z";
const SWEAT = "M515 300 Q600 360 685 300 L850 345 L1030 990 L925 1022 L830 560 L835 1165 Q600 1190 365 1165 L370 560 L275 1022 L170 990 L350 345 Z";
const TANK = "M500 280 Q600 420 700 280 L735 285 Q740 420 800 470 L800 1120 Q600 1140 400 1120 L400 470 Q460 420 465 285 Z";
const CROP = "M520 360 Q600 420 680 360 L800 390 L900 560 L830 600 L790 540 L790 860 Q600 880 410 860 L410 540 L370 600 L300 560 L400 390 Z";
const BRA = "M430 420 Q470 520 520 560 Q600 600 680 560 Q730 520 770 420 L800 430 Q820 620 810 760 Q600 800 390 760 Q380 620 400 430 Z";
const LEGGINGS = "M430 260 L770 260 L785 380 L760 1330 L640 1340 L605 520 L595 520 L560 1340 L440 1330 L415 380 Z";
const PANTS = "M410 260 L790 260 L820 400 L880 1320 L660 1340 L605 560 L595 560 L540 1340 L320 1320 L380 400 Z";
const SHORTS = "M405 470 L795 470 L830 600 L875 960 L650 990 L605 700 L595 700 L550 990 L325 960 L370 600 Z";
const JACKET = "M520 290 L600 330 L680 290 L860 345 L1040 995 L930 1025 L840 560 L845 1170 L355 1170 L360 560 L270 1025 L160 995 L340 345 Z";
const TOTE = "M330 560 L870 560 L910 1260 L290 1260 Z";
const BOTTLE = "M520 420 L680 420 L700 520 Q760 560 760 640 L760 1240 Q760 1290 710 1290 L490 1290 Q440 1290 440 1240 L440 640 Q440 560 500 520 Z";

function garment(type: GarmentType, fill: string): string {
  const dark = shade(fill, -26);
  const darker = shade(fill, -48);
  const light = shade(fill, 22);
  const seam = isLight(fill) ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.10)";
  const fold = isLight(fill) ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.22)";
  const p = (d: string, extra = "") => `<path d="${d}" fill="${fill}" ${extra}/>`;
  const shadeOverlay = (d: string) =>
    `<path d="${d}" fill="url(#sheen)"/><path d="${d}" fill="none" stroke="${darker}" stroke-opacity="0.25" stroke-width="3"/>`;
  const line = (d: string, w = 3, c = seam) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;

  switch (type) {
    case "tee":
      return p(TEE) + shadeOverlay(TEE) + line("M520 300 Q600 380 680 300", 10, dark) + line("M880 600 L820 505") + line("M320 600 L380 505") + line("M470 700 Q520 900 480 1120", 14, fold) + line("M760 720 Q720 900 740 1100", 12, fold);
    case "longsleeve":
      return p(LONG_SLEEVE) + shadeOverlay(LONG_SLEEVE) + line("M520 300 Q600 380 680 300", 10, dark) + line("M997 945 L913 970", 18, dark) + line("M203 945 L287 970", 18, dark) + line("M380 1125 Q600 1148 822 1125", 14, dark) + line("M470 700 Q520 900 480 1120", 14, fold);
    case "sweatshirt":
      return p(SWEAT) + shadeOverlay(SWEAT) + `<path d="M515 300 Q600 360 685 300 Q690 330 685 336 Q600 392 515 336 Q510 330 515 300 Z" fill="${dark}"/>` + line("M1028 975 L923 1006", 24, dark) + line("M172 975 L277 1006", 24, dark) + line("M366 1135 Q600 1160 834 1135", 30, dark) + line("M480 640 Q540 900 500 1110", 14, fold) + line("M740 660 Q700 860 730 1100", 12, fold);
    case "hoodie":
      return `<path d="M470 330 C440 150 760 150 730 330 Q600 300 470 330 Z" fill="${dark}"/>` + p(SWEAT) + shadeOverlay(SWEAT) + `<path d="M500 305 C500 220 700 220 700 305 Q600 400 500 305 Z" fill="${darker}"/>` + line("M560 360 L550 560", 6, light) + line("M640 360 L650 560", 6, light) + `<path d="M470 830 L730 830 L790 1060 L410 1060 Z" fill="${dark}" opacity="0.55"/>` + line("M1028 975 L923 1006", 24, dark) + line("M172 975 L277 1006", 24, dark) + line("M366 1135 Q600 1160 834 1135", 30, dark);
    case "tank":
      return p(TANK) + shadeOverlay(TANK) + line("M500 285 Q600 425 700 285", 8, dark) + line("M470 620 Q520 820 480 1100", 12, fold);
    case "crop":
      return p(CROP) + shadeOverlay(CROP) + line("M520 360 Q600 425 680 360", 8, dark) + line("M412 845 Q600 865 788 845", 14, dark) + [460, 520, 580, 640, 700].map((x) => line(`M${x} 440 L${x} 850`, 3, fold)).join("");
    case "bra":
      return `<path d="M470 300 L520 560 M730 300 L680 560" stroke="${dark}" stroke-width="26" stroke-linecap="round"/>` + p(BRA) + shadeOverlay(BRA) + line("M392 700 Q600 740 808 700", 40, dark) + line("M520 560 Q600 520 680 560", 4, seam);
    case "leggings":
      return p(LEGGINGS) + shadeOverlay(LEGGINGS) + `<path d="M430 260 L770 260 L776 340 L424 340 Z" fill="${dark}"/>` + line("M600 360 L600 520", 3) + line("M520 520 Q540 900 500 1300", 10, fold) + line("M690 520 Q665 900 700 1300", 10, fold);
    case "pants":
      return p(PANTS) + shadeOverlay(PANTS) + `<path d="M410 260 L790 260 L800 330 L400 330 Z" fill="${dark}"/>` + line("M560 280 L555 420", 5, light) + line("M640 280 L645 420", 5, light) + line("M390 450 L420 520", 4) + line("M810 450 L780 520", 4) + line("M470 560 Q480 900 430 1320", 12, fold) + line("M735 560 Q725 900 770 1320", 12, fold);
    case "shorts":
      return p(SHORTS) + shadeOverlay(SHORTS) + `<path d="M405 470 L795 470 L805 540 L395 540 Z" fill="${dark}"/>` + line("M600 540 L600 700", 3) + line("M470 620 Q480 800 440 960", 10, fold) + line("M735 620 Q725 800 760 960", 10, fold);
    case "biker":
      return `<path d="M430 420 L770 420 L790 540 L800 1000 L640 1010 L605 640 L595 640 L560 1010 L400 1000 L410 540 Z" fill="${fill}"/><path d="M430 420 L770 420 L790 540 L800 1000 L640 1010 L605 640 L595 640 L560 1010 L400 1000 L410 540 Z" fill="url(#sheen)"/><path d="M430 420 L770 420 L776 500 L424 500 Z" fill="${dark}"/>` + line("M520 640 Q530 820 500 990", 10, fold) + line("M690 640 Q680 820 700 990", 10, fold);
    case "jacket":
      return p(JACKET) + shadeOverlay(JACKET) + `<path d="M520 290 L600 330 L680 290 L700 250 L600 285 L500 250 Z" fill="${dark}"/>` + line("M600 330 L600 1170", 8, darker) + line("M600 330 L600 1170", 2, light) + `<rect x="420" y="820" width="120" height="8" fill="${darker}" opacity=".5"/><rect x="660" y="820" width="120" height="8" fill="${darker}" opacity=".5"/>` + line("M1038 980 L928 1010", 24, dark) + line("M162 980 L272 1010", 24, dark) + line("M356 1150 L844 1150", 30, dark);
    case "tote":
      return `<path d="M450 580 C450 300 750 300 750 580" fill="none" stroke="${dark}" stroke-width="34"/>` + p(TOTE) + shadeOverlay(TOTE) + line("M330 640 L870 640", 4) + line("M520 700 Q540 1000 500 1240", 12, fold);
    case "duffel":
      return `<path d="M430 640 C430 460 770 460 770 640" fill="none" stroke="${dark}" stroke-width="30"/><rect x="220" y="620" width="760" height="480" rx="180" fill="${fill}"/><rect x="220" y="620" width="760" height="480" rx="180" fill="url(#sheen)"/>` + line("M320 700 L880 700", 6, darker) + `<rect x="250" y="780" width="120" height="240" rx="50" fill="${dark}"/><rect x="830" y="780" width="120" height="240" rx="50" fill="${dark}"/>`;
    case "cap":
      return `<path d="M340 840 C340 540 860 540 860 840 Z" fill="${fill}"/><path d="M340 840 C340 540 860 540 860 840 Z" fill="url(#sheen)"/><path d="M330 830 Q600 800 860 830 Q1060 850 1110 920 Q1000 950 860 905 Q600 870 330 880 Z" fill="${dark}"/>` + line("M600 575 L600 830", 4) + line("M470 610 Q450 720 455 830", 3) + line("M730 610 Q750 720 745 830", 3) + `<circle cx="600" cy="620" r="14" fill="${dark}"/>`;
    case "socks": {
      const sock = (dx: number) =>
        `<g transform="translate(${dx} 0)"><path d="M0 300 L170 300 L170 900 Q170 960 230 990 L330 1040 Q390 1080 360 1150 Q330 1200 260 1180 L60 1090 Q0 1060 0 990 Z" fill="${fill}"/><path d="M0 300 L170 300 L170 900 Q170 960 230 990 L330 1040 Q390 1080 360 1150 Q330 1200 260 1180 L60 1090 Q0 1060 0 990 Z" fill="url(#sheen)"/><rect x="0" y="300" width="170" height="110" fill="${dark}"/><line x1="0" y1="440" x2="170" y2="440" stroke="${seam}" stroke-width="10"/><line x1="0" y1="470" x2="170" y2="470" stroke="${seam}" stroke-width="10"/></g>`;
      return sock(330) + sock(640);
    }
    case "bottle":
      return p(BOTTLE) + shadeOverlay(BOTTLE) + `<rect x="505" y="300" width="190" height="130" rx="24" fill="${darker}"/><rect x="440" y="820" width="320" height="160" fill="${dark}" opacity=".35"/>`;
    case "set": {
      const top: string = `<g transform="translate(-200 -60) scale(0.9)">${garment("bra", fill)}</g>`;
      const bottom: string = `<g transform="translate(330 260) scale(0.75)">${garment("leggings", fill)}</g>`;
      return top + bottom;
    }
    case "lounge": {
      const top: string = `<g transform="translate(-160 -40) scale(0.72)">${garment("hoodie", fill)}</g>`;
      const bottom: string = `<g transform="translate(420 300) scale(0.68)">${garment("pants", fill)}</g>`;
      return top + bottom;
    }
  }
}

function backgroundFor(hex: string, view: 0 | 1) {
  if (isLight(hex)) return view === 0 ? "#e7e3dc" : "#dcd7ce";
  return view === 0 ? "#f1efea" : "#e9e6df";
}

function productSvg(type: GarmentType, hex: string, view: 0 | 1) {
  const bg = backgroundFor(hex, view);
  const art = garment(type, hex);
  // view 1: detail crop with a subtle plinth, to give the hover image a different composition
  const transform = view === 0 ? "translate(0 30)" : "translate(-420 -380) scale(1.7)";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.18"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="28"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="${bg}"/>
  ${view === 0 ? `<ellipse cx="600" cy="1250" rx="360" ry="30" fill="#000" opacity="0.10" filter="url(#soft)"/>` : ""}
  <g transform="${transform}">
    <g transform="translate(14 22)" opacity="0.10" filter="url(#soft)">${garment(type, "#000000")}</g>
    ${art}
  </g>
</svg>`;
}

function editorialSvg(w: number, h: number, palette: { bg: string; items: { type: GarmentType; hex: string; x: number; y: number; s: number; r?: number }[]; block?: string }) {
  const items = palette.items
    .map(
      (it) =>
        `<g transform="translate(${it.x} ${it.y}) rotate(${it.r ?? 0} 600 750) scale(${it.s})"><g transform="translate(18 26)" opacity="0.13" filter="url(#soft)">${garment(it.type, "#000000")}</g>${garment(it.type, it.hex)}</g>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.18"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="30"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="${palette.bg}"/>
  ${palette.block ? `<rect x="${w * 0.52}" y="0" width="${w * 0.48}" height="${h}" fill="${palette.block}"/>` : ""}
  ${items}
</svg>`;
}

async function writeWebp(svg: string, file: string, quality = 80) {
  await sharp(Buffer.from(svg)).webp({ quality }).toFile(path.join(OUT, file));
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let count = 0;
  const combos = new Set<string>();
  for (const [type, colors] of Object.entries(GARMENT_TYPES) as [GarmentType, string[]][]) {
    for (const color of colors) combos.add(`${type}|${color}`);
  }
  for (const combo of combos) {
    const [type, color] = combo.split("|") as [GarmentType, string];
    const hex = DEMO_COLORS.find((c) => c.name === color)!.hex;
    for (const view of [0, 1] as const) {
      await writeWebp(productSvg(type, hex, view), imageName(type, color, view));
      count++;
    }
  }

  const c = (n: string) => DEMO_COLORS.find((x) => x.name === n)!.hex;
  const editorials: { file: string; w: number; h: number; spec: Parameters<typeof editorialSvg>[2] }[] = [
    {
      file: "hero-desktop.webp",
      w: 2400,
      h: 1200,
      spec: {
        bg: "#ebe6de",
        block: "#dcd4c7",
        items: [
          { type: "hoodie", hex: c("Brown"), x: 1180, y: -60, s: 0.82, r: -6 },
          { type: "leggings", hex: c("Black"), x: 1640, y: 40, s: 0.72, r: 8 },
          { type: "cap", hex: c("Green"), x: 1720, y: 560, s: 0.45, r: 12 },
        ],
      },
    },
    {
      file: "hero-mobile.webp",
      w: 1200,
      h: 1600,
      spec: {
        bg: "#ebe6de",
        items: [
          { type: "hoodie", hex: c("Brown"), x: -40, y: -260, s: 0.62, r: -6 },
          { type: "leggings", hex: c("Black"), x: 420, y: -200, s: 0.55, r: 8 },
        ],
      },
    },
    {
      file: "editorial-active.webp",
      w: 1600,
      h: 2000,
      spec: {
        bg: "#1e1e1e",
        items: [
          { type: "bra", hex: c("Green"), x: -80, y: 0, s: 0.95, r: -8 },
          { type: "biker", hex: c("Green"), x: 420, y: 520, s: 0.9, r: 6 },
        ],
      },
    },
    {
      file: "editorial-essentials.webp",
      w: 1600,
      h: 2000,
      spec: {
        bg: "#efece6",
        items: [
          { type: "sweatshirt", hex: c("Grey"), x: -60, y: -40, s: 0.9, r: -4 },
          { type: "pants", hex: c("Beige"), x: 480, y: 520, s: 0.85, r: 5 },
        ],
      },
    },
    {
      file: "editorial-premium.webp",
      w: 1600,
      h: 2000,
      spec: {
        bg: "#d8d1c6",
        items: [
          { type: "jacket", hex: c("Brown"), x: 100, y: 60, s: 1.0, r: -3 },
          { type: "tote", hex: c("Black"), x: 700, y: 900, s: 0.55, r: 8 },
        ],
      },
    },
    {
      file: "editorial-summer.webp",
      w: 1600,
      h: 2000,
      spec: {
        bg: "#e7ecef",
        items: [
          { type: "tee", hex: c("White"), x: -40, y: 20, s: 0.9, r: -6 },
          { type: "shorts", hex: c("Blue"), x: 520, y: 700, s: 0.85, r: 6 },
        ],
      },
    },
    {
      file: "editorial-new.webp",
      w: 1600,
      h: 2000,
      spec: {
        bg: "#f1efea",
        items: [
          { type: "longsleeve", hex: c("Black"), x: 40, y: -40, s: 0.95, r: -4 },
          { type: "cap", hex: c("Beige"), x: 700, y: 1100, s: 0.55, r: 10 },
        ],
      },
    },
    {
      file: "banner-sale.webp",
      w: 2400,
      h: 1000,
      spec: {
        bg: "#1c1c1c",
        items: [
          { type: "sweatshirt", hex: c("Blue"), x: 1100, y: -150, s: 0.8, r: -8 },
          { type: "shorts", hex: c("Grey"), x: 1650, y: 100, s: 0.7, r: 10 },
        ],
      },
    },
    {
      file: "og-default.webp",
      w: 1200,
      h: 630,
      spec: {
        bg: "#e9e4dc",
        items: [
          { type: "hoodie", hex: c("Brown"), x: 200, y: -330, s: 0.6, r: -6 },
          { type: "leggings", hex: c("Black"), x: 550, y: -200, s: 0.5, r: 8 },
        ],
      },
    },
  ];
  for (const e of editorials) {
    await writeWebp(editorialSvg(e.w, e.h, e.spec), e.file, 82);
    count++;
  }
  console.log(`Generated ${count} images in public/demo`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
