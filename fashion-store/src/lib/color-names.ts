/**
 * Colour swatches from colour names ("Біло-сірий", "Темно-синій", "Мокко", "black/white"…).
 * Shared by the importer (new colours get a matching hex) and the storefront (swatches follow the name).
 */

/** Word stems (uk / ru / en) → hex. More specific stems first: the first prefix match wins. */
const STEMS: [string, string][] = [
  // black / white / grey
  ["чорн", "#1c1c1c"], ["черн", "#1c1c1c"], ["black", "#1c1c1c"],
  ["графіт", "#3d3f42"], ["графит", "#3d3f42"], ["антрацит", "#2f3133"],
  ["біл", "#f6f4ef"], ["бел", "#f6f4ef"], ["white", "#f6f4ef"],
  ["айвор", "#f2ebdc"], ["ivory", "#f2ebdc"], ["ванил", "#f3e5c3"], ["ваніл", "#f3e5c3"],
  ["молоч", "#efe6d6"], ["кремов", "#ece0c8"], ["крем", "#ece0c8"], ["cream", "#ece0c8"], ["екрю", "#e9dfcb"], ["экрю", "#e9dfcb"], ["ecru", "#e9dfcb"],
  ["срібл", "#c4c6c8"], ["серебр", "#c4c6c8"], ["silver", "#c4c6c8"],
  ["сір", "#9fa0a0"], ["сер", "#9fa0a0"], ["grey", "#9fa0a0"], ["gray", "#9fa0a0"], ["меланж", "#b3b2ae"],
  // browns / beiges
  ["шоколад", "#4a2f24"], ["chocolate", "#4a2f24"], ["коричн", "#6b4a3a"], ["brown", "#6b4a3a"],
  ["мокко", "#8a6a55"], ["мока", "#8a6a55"], ["mocha", "#8a6a55"], ["капучин", "#a7846a"], ["кав", "#7a5a45"], ["кофе", "#7a5a45"], ["coffee", "#7a5a45"],
  ["карамел", "#b9804e"], ["руд", "#a8562f"], ["рыж", "#a8562f"], ["camel", "#c19a6b"], ["кемел", "#c19a6b"], ["кэмел", "#c19a6b"],
  ["бежев", "#d8c6a8"], ["беж", "#d8c6a8"], ["beige", "#d8c6a8"], ["пісоч", "#d9c29c"], ["песоч", "#d9c29c"], ["sand", "#d9c29c"],
  ["тауп", "#8b7d72"], ["taupe", "#8b7d72"], ["нюд", "#e2c4ad"], ["nude", "#e2c4ad"], ["тілесн", "#e8c9b0"], ["телесн", "#e8c9b0"],
  // blues
  ["нейві", "#1f2a44"], ["navy", "#1f2a44"], ["індиго", "#2e3a6b"], ["индиго", "#2e3a6b"],
  ["джинс", "#4f6a8f"], ["денім", "#4f6a8f"], ["деним", "#4f6a8f"], ["denim", "#4f6a8f"],
  ["електрик", "#2f55d4"], ["электрик", "#2f55d4"], ["волошк", "#5a78d6"], ["василь", "#5a78d6"],
  ["син", "#26408b"], ["blue", "#26408b"], ["блакит", "#9cc0e0"], ["голуб", "#9cc0e0"], ["бірюз", "#3fb6b0"], ["бирюз", "#3fb6b0"], ["turquoise", "#3fb6b0"], ["м'ят", "#a8dcc8"], ["мят", "#a8dcc8"], ["mint", "#a8dcc8"],
  // greens
  ["хакі", "#7a7652"], ["хаки", "#7a7652"], ["khaki", "#7a7652"], ["олив", "#6b6b3e"], ["olive", "#6b6b3e"],
  ["смарагд", "#1f6b4f"], ["изумруд", "#1f6b4f"], ["emerald", "#1f6b4f"], ["пляшк", "#1e4d36"], ["бутыл", "#1e4d36"],
  ["фісташ", "#b5c98e"], ["фисташ", "#b5c98e"], ["шавл", "#a3b09a"], ["шалф", "#a3b09a"], ["sage", "#a3b09a"], ["салат", "#9fd15a"], ["лайм", "#c4e04a"],
  ["зелен", "#3f7a4a"], ["green", "#3f7a4a"],
  // reds / pinks / purples
  ["бордо", "#6b1f2c"], ["бордов", "#6b1f2c"], ["burgundy", "#6b1f2c"], ["винн", "#722f37"], ["винов", "#722f37"], ["марсал", "#8a3b3a"], ["вишн", "#7b1e2f"],
  ["червон", "#b8302b"], ["красн", "#b8302b"], ["red", "#b8302b"], ["теракот", "#b5583a"], ["цеглян", "#a64b35"], ["кирпич", "#a64b35"],
  ["корал", "#f08a6c"], ["coral", "#f08a6c"], ["лосос", "#f2a385"], ["персик", "#f6c3a1"], ["peach", "#f6c3a1"],
  ["пудр", "#e9c6c0"], ["powder", "#e9c6c0"], ["рожев", "#efb3c2"], ["розов", "#efb3c2"], ["pink", "#efb3c2"],
  ["фукс", "#c4307a"], ["fuchsia", "#c4307a"], ["малин", "#b3244f"], ["ягід", "#8f2f52"], ["ягод", "#8f2f52"],
  ["лаванд", "#b8a6d9"], ["lavender", "#b8a6d9"], ["бузк", "#b49ac9"], ["сирен", "#b49ac9"], ["лілов", "#9c78b5"], ["лилов", "#9c78b5"],
  ["фіолет", "#6b3f99"], ["фиолет", "#6b3f99"], ["purple", "#6b3f99"], ["баклажан", "#4b2a45"],
  // yellows / oranges / metallics
  ["гірчи", "#c49a2c"], ["горчи", "#c49a2c"], ["mustard", "#c49a2c"], ["лимон", "#f1e05a"], ["жовт", "#f0c93a"], ["желт", "#f0c93a"], ["yellow", "#f0c93a"],
  ["помаранч", "#ec7a2f"], ["оранж", "#ec7a2f"], ["orange", "#ec7a2f"], ["морков", "#e3672e"],
  ["золот", "#c8a24a"], ["gold", "#c8a24a"], ["бронз", "#9c6b3a"], ["мідн", "#b3673f"], ["медн", "#b3673f"],
];

const LIGHT = /^(світло|светло|блідо|бледно|ніжно|нежно|пастельн|light|pale)/;
const DARK = /^(темно|глибок|глубок|насичен|насыщен|dark|deep)/;
const DUSTY = /^(пильн|пыльн|dusty)/;

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]: number[]) {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
}
const mix = (hex: string, target: number[], amount: number) => rgbToHex(hexToRgb(hex).map((v, i) => v + (target[i] - v) * amount));

function stemHex(word: string) {
  return STEMS.find(([stem]) => word.startsWith(stem))?.[1] ?? null;
}

/** The colours a name describes, in order (at most two: "Чорно-білий" → black, white). */
export function colorsFromName(name: string): string[] {
  const words = name
    .toLowerCase()
    .replace(/[’ʼ`]/g, "'")
    .split(/[\s\-/,+&()]+|\s+(?:і|й|и|та|and)\s+/)
    .filter(Boolean);
  const out: string[] = [];
  let modifier: "light" | "dark" | "dusty" | null = null;
  for (const w of words) {
    if (LIGHT.test(w)) modifier = "light";
    else if (DARK.test(w)) modifier = "dark";
    else if (DUSTY.test(w)) modifier = "dusty";
    const hex = stemHex(w) ?? (modifier && w.length > 6 ? stemHex(w.replace(LIGHT, "").replace(DARK, "").replace(DUSTY, "")) : null);
    if (!hex) continue;
    out.push(modifier === "light" ? mix(hex, [255, 255, 255], 0.45) : modifier === "dark" ? mix(hex, [0, 0, 0], 0.4) : modifier === "dusty" ? mix(hex, [150, 140, 135], 0.35) : hex);
    modifier = null;
    if (out.length === 2) break;
  }
  return out;
}

/** Hex for a new colour: the main (last) colour of the name, or null when the name is not recognised. */
export function colorHexFromName(name: string): string | null {
  const c = colorsFromName(name);
  return c.length ? c[c.length - 1] : null;
}

const DEFAULT_HEX = "#888888";

/**
 * CSS background for a swatch: two-tone names get a split circle, recognised names follow the name
 * when the saved hex is the "unknown" grey, otherwise the saved hex is kept (manual choice).
 */
export function swatchBackground(name: string, hex: string | null | undefined) {
  const c = colorsFromName(name);
  if (c.length >= 2) return `linear-gradient(135deg, ${c[0]} 0 50%, ${c[1]} 50% 100%)`;
  if (c.length === 1 && (!hex || hex.toLowerCase() === DEFAULT_HEX)) return c[0];
  return hex ?? DEFAULT_HEX;
}
