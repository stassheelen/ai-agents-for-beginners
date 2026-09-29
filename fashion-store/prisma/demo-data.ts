// Demo catalogue used by the seed script and the demo image generator.
// All names and copy are original placeholder content.

export type GarmentType =
  | "tee"
  | "longsleeve"
  | "sweatshirt"
  | "hoodie"
  | "tank"
  | "crop"
  | "bra"
  | "leggings"
  | "pants"
  | "shorts"
  | "biker"
  | "jacket"
  | "tote"
  | "duffel"
  | "cap"
  | "socks"
  | "bottle"
  | "set"
  | "lounge";

export const DEMO_COLORS = [
  { name: "Black", slug: "black", hex: "#1c1c1c" },
  { name: "White", slug: "white", hex: "#f4f2ee" },
  { name: "Grey", slug: "grey", hex: "#a3a4a2" },
  { name: "Brown", slug: "brown", hex: "#5e4436" },
  { name: "Beige", slug: "beige", hex: "#d6c5ab" },
  { name: "Blue", slug: "blue", hex: "#7b90a8" },
  { name: "Green", slug: "green", hex: "#5f6549" },
];

export const APPAREL_SIZES = ["XS", "S", "M", "L", "XL"];

export type DemoProduct = {
  sku: string;
  name: string;
  type: GarmentType;
  category: string; // top-level slug
  subcategory: string; // child slug
  collections: string[];
  colors: string[];
  price: number; // UAH, major units
  compareAt?: number;
  cost: number;
  flags?: { isNew?: boolean; bestSeller?: boolean; featured?: boolean };
  sizes?: string[];
  material: string;
  short: string;
  tags: string[];
};

export const DEMO_CATEGORIES: { name: string; slug: string; nav?: boolean; description: string; children: { name: string; slug: string; image?: [GarmentType, string] }[] }[] = [
  {
    name: "Active",
    slug: "active",
    nav: true,
    description: "Технічні речі для студії, залу та бігу — з підтримкою, що не відволікає.",
    children: [
      { name: "Sports Bras", slug: "sports-bras", image: ["bra", "Green"] },
      { name: "Active Leggings", slug: "active-leggings", image: ["leggings", "Black"] },
      { name: "Bike Shorts", slug: "bike-shorts", image: ["biker", "Brown"] },
    ],
  },
  {
    name: "Clothing",
    slug: "clothing",
    nav: true,
    description: "Базовий гардероб: худі, світшоти, футболки та штани на кожен день.",
    children: [
      { name: "Hoodies", slug: "hoodies", image: ["hoodie", "Brown"] },
      { name: "Sweatshirts", slug: "sweatshirts", image: ["sweatshirt", "Grey"] },
      { name: "T-shirts", slug: "t-shirts", image: ["tee", "White"] },
      { name: "Tops", slug: "tops", image: ["tank", "Black"] },
      { name: "Leggings", slug: "leggings", image: ["leggings", "Brown"] },
      { name: "Pants", slug: "pants", image: ["pants", "Beige"] },
      { name: "Shorts", slug: "shorts", image: ["shorts", "Grey"] },
      { name: "Jackets", slug: "jackets", image: ["jacket", "Black"] },
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    nav: true,
    description: "Деталі, що завершують образ.",
    children: [
      { name: "Bags", slug: "bags", image: ["tote", "Beige"] },
      { name: "Caps", slug: "caps", image: ["cap", "Green"] },
      { name: "Socks", slug: "socks", image: ["socks", "White"] },
      { name: "Other", slug: "other-accessories", image: ["bottle", "Black"] },
    ],
  },
  {
    name: "Sets",
    slug: "sets",
    description: "Продумані комплекти — верх і низ, що створені одне для одного.",
    children: [],
  },
];

export const DEMO_COLLECTIONS = [
  { name: "New Season", slug: "new-season", image: "/demo/editorial-new.webp", description: "Нові силуети сезону: чисті лінії, приглушені відтінки, м'які фактури." },
  { name: "Active Studio", slug: "active-studio", image: "/demo/editorial-active.webp", description: "Колекція для тренувань з високою посадкою, щільним трикотажем і нульовою прозорістю." },
  { name: "Essentials", slug: "essentials", image: "/demo/editorial-essentials.webp", description: "Речі, до яких повертаєшся щодня. Важкий бавовняний трикотаж і вільний крій." },
  { name: "Premium", slug: "premium", image: "/demo/editorial-premium.webp", description: "Преміальні тканини та ретельне опрацювання деталей." },
  { name: "Summer", slug: "summer", image: "/demo/editorial-summer.webp", description: "Легкі речі для теплих днів у місті та на тренуванні." },
];

const COTTON = "80% бавовна, 20% поліестер. Щільність 380 г/м², начос всередині.";
const JERSEY = "100% органічна бавовна, 220 г/м².";
const ACTIVE = "76% поліамід, 24% еластан. Технологія швидкого висихання.";
const RIB = "92% бавовна, 8% еластан, рубчик 2×2.";

export const DEMO_PRODUCTS: DemoProduct[] = [
  // Hoodies
  { sku: "NF-HD-001", name: "Oversized Fleece Hoodie", type: "hoodie", category: "clothing", subcategory: "hoodies", collections: ["essentials"], colors: ["Black", "Grey", "Brown"], price: 2890, cost: 1100, flags: { bestSeller: true, featured: true }, material: COTTON, short: "Об'ємне худі з м'яким начосом і подвійним капюшоном.", tags: ["hoodie", "fleece", "oversized"] },
  { sku: "NF-HD-002", name: "Zip-Through Hoodie", type: "hoodie", category: "clothing", subcategory: "hoodies", collections: ["new-season"], colors: ["Black", "Beige"], price: 3190, cost: 1250, flags: { isNew: true }, material: COTTON, short: "Худі на двосторонній блискавці з металевою фурнітурою.", tags: ["hoodie", "zip"] },
  { sku: "NF-HD-003", name: "Cropped Studio Hoodie", type: "hoodie", category: "clothing", subcategory: "hoodies", collections: ["active-studio"], colors: ["White", "Green"], price: 2590, cost: 980, flags: { isNew: true }, material: COTTON, short: "Укорочене худі для студії та міста.", tags: ["hoodie", "cropped"] },
  { sku: "NF-HD-004", name: "Heavyweight Hoodie", type: "hoodie", category: "clothing", subcategory: "hoodies", collections: ["premium"], colors: ["Grey", "Blue"], price: 3490, compareAt: 3990, cost: 1400, material: "100% бавовна, 460 г/м².", short: "Щільне худі з важкого трикотажу, що тримає форму.", tags: ["hoodie", "heavyweight"] },
  // Sweatshirts
  { sku: "NF-SW-001", name: "Classic Crew Sweatshirt", type: "sweatshirt", category: "clothing", subcategory: "sweatshirts", collections: ["essentials"], colors: ["Grey", "Black", "Beige"], price: 2390, cost: 900, flags: { bestSeller: true }, material: COTTON, short: "Класичний світшот з круглим вирізом та рубчастими манжетами.", tags: ["sweatshirt", "crew"] },
  { sku: "NF-SW-002", name: "Boxy Half-Zip Sweatshirt", type: "sweatshirt", category: "clothing", subcategory: "sweatshirts", collections: ["new-season"], colors: ["Brown", "White"], price: 2790, cost: 1050, flags: { isNew: true, featured: true }, material: COTTON, short: "Прямий силует і коротка блискавка біля горловини.", tags: ["sweatshirt", "half-zip"] },
  { sku: "NF-SW-003", name: "Brushed Cotton Sweatshirt", type: "sweatshirt", category: "clothing", subcategory: "sweatshirts", collections: ["summer"], colors: ["Green", "Blue"], price: 2490, compareAt: 2990, cost: 950, material: COTTON, short: "М'який брашований трикотаж для прохолодних вечорів.", tags: ["sweatshirt"] },
  // T-shirts
  { sku: "NF-TS-001", name: "Essential Crew Tee", type: "tee", category: "clothing", subcategory: "t-shirts", collections: ["essentials"], colors: ["White", "Black", "Grey"], price: 990, cost: 320, flags: { bestSeller: true }, material: JERSEY, short: "Базова футболка з щільного органічного бавовняного джерсі.", tags: ["tee", "t-shirt", "basic"] },
  { sku: "NF-TS-002", name: "Oversized Heavy Tee", type: "tee", category: "clothing", subcategory: "t-shirts", collections: ["premium"], colors: ["Black", "Beige", "Brown"], price: 1290, cost: 430, flags: { featured: true }, material: "100% бавовна, 280 г/м².", short: "Вільна футболка зі спущеною лінією плеча.", tags: ["tee", "oversized"] },
  { sku: "NF-TS-003", name: "Fitted Rib Tee", type: "tee", category: "clothing", subcategory: "t-shirts", collections: ["summer"], colors: ["White", "Blue"], price: 1090, cost: 360, flags: { isNew: true }, material: RIB, short: "Приталена футболка з еластичного рубчика.", tags: ["tee", "rib", "fitted"] },
  { sku: "NF-TS-004", name: "Long Sleeve Studio Tee", type: "longsleeve", category: "clothing", subcategory: "t-shirts", collections: ["active-studio"], colors: ["Black", "Green"], price: 1390, cost: 480, material: ACTIVE, short: "Лонгслів з технічної тканини для тренувань.", tags: ["longsleeve", "active"] },
  // Tops
  { sku: "NF-TP-001", name: "Seamless Tank Top", type: "tank", category: "clothing", subcategory: "tops", collections: ["active-studio"], colors: ["Black", "White", "Brown"], price: 1190, cost: 400, flags: { isNew: true }, material: ACTIVE, short: "Безшовна майка, що сідає як друга шкіра.", tags: ["tank", "seamless", "top"] },
  { sku: "NF-TP-002", name: "Ribbed Crop Top", type: "crop", category: "clothing", subcategory: "tops", collections: ["summer"], colors: ["Grey", "Beige"], price: 1090, compareAt: 1390, cost: 350, material: RIB, short: "Укорочений топ із рубчика з коротким рукавом.", tags: ["crop", "top", "rib"] },
  { sku: "NF-TP-003", name: "Wrap Long Sleeve Top", type: "longsleeve", category: "clothing", subcategory: "tops", collections: ["premium"], colors: ["Black", "Blue"], price: 1590, cost: 560, material: ACTIVE, short: "Топ із запахом та довгим рукавом.", tags: ["top", "wrap"] },
  // Sports bras
  { sku: "NF-BR-001", name: "Sculpt Sports Bra", type: "bra", category: "active", subcategory: "sports-bras", collections: ["active-studio"], colors: ["Black", "Brown", "Green"], price: 1390, cost: 450, flags: { bestSeller: true }, material: ACTIVE, short: "Бра середньої підтримки зі знімними чашками.", tags: ["bra", "sports bra", "active"] },
  { sku: "NF-BR-002", name: "Cross-Back Bra", type: "bra", category: "active", subcategory: "sports-bras", collections: ["new-season"], colors: ["White", "Blue"], price: 1290, cost: 420, flags: { isNew: true }, material: ACTIVE, short: "Перехресні бретелі на спині та м'яка підтримка.", tags: ["bra", "cross-back"] },
  { sku: "NF-BR-003", name: "High Support Bra", type: "bra", category: "active", subcategory: "sports-bras", collections: ["premium"], colors: ["Black", "Grey"], price: 1590, cost: 520, flags: { featured: true }, material: ACTIVE, short: "Висока підтримка для бігу та інтенсивних тренувань.", tags: ["bra", "high support"] },
  // Leggings
  { sku: "NF-LG-001", name: "Sculpt High-Rise Leggings", type: "leggings", category: "active", subcategory: "active-leggings", collections: ["active-studio"], colors: ["Black", "Brown", "Green", "Blue"], price: 2190, cost: 700, flags: { bestSeller: true, featured: true }, material: ACTIVE, short: "Легінси з високою посадкою та моделюючим поясом.", tags: ["leggings", "high-rise", "active"] },
  { sku: "NF-LG-002", name: "Flared Leggings", type: "leggings", category: "clothing", subcategory: "leggings", collections: ["new-season"], colors: ["Black", "Grey"], price: 2290, cost: 740, flags: { isNew: true }, material: ACTIVE, short: "Легінси-кльош з м'якого еластичного трикотажу.", tags: ["leggings", "flared"] },
  { sku: "NF-LG-003", name: "Seamless Rib Leggings", type: "leggings", category: "clothing", subcategory: "leggings", collections: ["essentials"], colors: ["Beige", "Brown"], price: 1990, compareAt: 2490, cost: 640, material: RIB, short: "Безшовні легінси з рубчастою текстурою.", tags: ["leggings", "seamless", "rib"] },
  { sku: "NF-LG-004", name: "Pocket Leggings 7/8", type: "leggings", category: "active", subcategory: "active-leggings", collections: ["premium"], colors: ["Black", "Blue"], price: 2390, cost: 780, material: ACTIVE, short: "Довжина 7/8 та бічні кишені для телефону.", tags: ["leggings", "pockets"] },
  // Pants
  { sku: "NF-PT-001", name: "Wide-Leg Sweatpants", type: "pants", category: "clothing", subcategory: "pants", collections: ["essentials"], colors: ["Grey", "Black", "Beige"], price: 2590, cost: 950, flags: { bestSeller: true }, material: COTTON, short: "Широкі спортивні штани з високою посадкою.", tags: ["pants", "sweatpants", "wide-leg"] },
  { sku: "NF-PT-002", name: "Tailored Jogger", type: "pants", category: "clothing", subcategory: "pants", collections: ["premium"], colors: ["Black", "Brown"], price: 2790, cost: 1020, material: "72% віскоза, 24% поліамід, 4% еластан.", short: "Джогери з акуратною стрілкою та прихованими кишенями.", tags: ["pants", "jogger"] },
  { sku: "NF-PT-003", name: "Straight Track Pants", type: "pants", category: "clothing", subcategory: "pants", collections: ["new-season"], colors: ["Blue", "White"], price: 2490, cost: 900, flags: { isNew: true }, material: "100% поліамід.", short: "Прямі трекові штани з легкої тканини.", tags: ["pants", "track"] },
  // Shorts
  { sku: "NF-SH-001", name: "Biker Shorts", type: "biker", category: "active", subcategory: "bike-shorts", collections: ["active-studio"], colors: ["Black", "Brown", "Green"], price: 1290, cost: 420, flags: { bestSeller: true }, material: ACTIVE, short: "Велосипедки з високою посадкою та плоскими швами.", tags: ["shorts", "biker"] },
  { sku: "NF-SH-002", name: "Sweat Shorts", type: "shorts", category: "clothing", subcategory: "shorts", collections: ["summer"], colors: ["Grey", "Beige"], price: 1390, compareAt: 1690, cost: 480, material: COTTON, short: "Шорти з м'якого футеру з кулісою.", tags: ["shorts", "sweat"] },
  { sku: "NF-SH-003", name: "Running Shorts", type: "shorts", category: "clothing", subcategory: "shorts", collections: ["summer"], colors: ["Black", "Blue"], price: 1190, cost: 390, flags: { isNew: true }, material: "100% поліестер, вбудовані велосипедки.", short: "Легкі шорти для бігу з внутрішнім шаром.", tags: ["shorts", "running"] },
  // Jackets
  { sku: "NF-JK-001", name: "Lightweight Track Jacket", type: "jacket", category: "clothing", subcategory: "jackets", collections: ["new-season"], colors: ["Black", "Green"], price: 3590, cost: 1400, flags: { isNew: true, featured: true }, material: "100% переробений поліамід.", short: "Легка трекова куртка з вітрозахисної тканини.", tags: ["jacket", "track"] },
  { sku: "NF-JK-002", name: "Structured Overshirt Jacket", type: "jacket", category: "clothing", subcategory: "jackets", collections: ["premium"], colors: ["Brown", "Black"], price: 4290, cost: 1700, material: "60% бавовна, 40% вовна.", short: "Сорочка-куртка з щільної вовняної суміші.", tags: ["jacket", "overshirt"] },
  { sku: "NF-JK-003", name: "Fleece Zip Jacket", type: "jacket", category: "clothing", subcategory: "jackets", collections: ["essentials"], colors: ["Beige", "Grey"], price: 3890, compareAt: 4490, cost: 1500, material: "100% поліестер, фліс 300 г/м².", short: "Теплий фліс на блискавці з високим коміром.", tags: ["jacket", "fleece"] },
  // Accessories
  { sku: "NF-BG-001", name: "Canvas Tote Bag", type: "tote", category: "accessories", subcategory: "bags", collections: ["essentials"], colors: ["Beige", "Black"], price: 1490, cost: 420, sizes: ["ONE SIZE"], material: "100% бавовняний канвас, 16 oz.", short: "Місткий шопер з внутрішньою кишенею.", tags: ["bag", "tote"] },
  { sku: "NF-BG-002", name: "Gym Duffel Bag", type: "duffel", category: "accessories", subcategory: "bags", collections: ["active-studio"], colors: ["Black", "Brown"], price: 2890, cost: 980, flags: { featured: true }, sizes: ["ONE SIZE"], material: "Водовідштовхувальний нейлон.", short: "Спортивна сумка з відділенням для взуття.", tags: ["bag", "duffel", "gym"] },
  { sku: "NF-CP-001", name: "Washed Cotton Cap", type: "cap", category: "accessories", subcategory: "caps", collections: ["essentials"], colors: ["Black", "Beige", "Green", "Blue"], price: 790, cost: 220, flags: { bestSeller: true }, sizes: ["ONE SIZE"], material: "100% бавовна з ефектом вареної тканини.", short: "Кепка з вигнутим козирком і регульованим ремінцем.", tags: ["cap", "hat"] },
  { sku: "NF-CP-002", name: "Nylon Sport Cap", type: "cap", category: "accessories", subcategory: "caps", collections: ["summer"], colors: ["White", "Black"], price: 890, cost: 260, flags: { isNew: true }, sizes: ["ONE SIZE"], material: "Легкий нейлон, швидко висихає.", short: "Легка кепка для бігу.", tags: ["cap", "running"] },
  { sku: "NF-SK-001", name: "Crew Socks 3-Pack", type: "socks", category: "accessories", subcategory: "socks", collections: ["essentials"], colors: ["White", "Black", "Grey"], price: 490, cost: 140, flags: { bestSeller: true }, sizes: ["36-38", "39-41", "42-44"], material: "80% бавовна, 18% поліамід, 2% еластан.", short: "Набір із трьох пар високих шкарпеток.", tags: ["socks"] },
  { sku: "NF-SK-002", name: "Sport Ankle Socks", type: "socks", category: "accessories", subcategory: "socks", collections: ["active-studio"], colors: ["White", "Green"], price: 390, compareAt: 490, cost: 110, sizes: ["36-38", "39-41", "42-44"], material: "Бавовна з анатомічною підтримкою стопи.", short: "Короткі спортивні шкарпетки.", tags: ["socks", "sport"] },
  { sku: "NF-AC-001", name: "Steel Water Bottle", type: "bottle", category: "accessories", subcategory: "other-accessories", collections: ["active-studio"], colors: ["Black", "White"], price: 690, cost: 210, sizes: ["ONE SIZE"], material: "Нержавіюча сталь, 750 мл, подвійні стінки.", short: "Термопляшка, що тримає холод до 24 годин.", tags: ["bottle", "accessories"] },
  // Sets
  { sku: "NF-ST-001", name: "Sculpt Studio Set", type: "set", category: "sets", subcategory: "sets", collections: ["active-studio", "new-season"], colors: ["Black", "Brown"], price: 3290, cost: 1100, flags: { isNew: true, featured: true }, material: ACTIVE, short: "Комплект: бра середньої підтримки та легінси з високою посадкою.", tags: ["set", "active"] },
  { sku: "NF-ST-002", name: "Lounge Set", type: "lounge", category: "sets", subcategory: "sets", collections: ["essentials"], colors: ["Grey", "Beige"], price: 4990, compareAt: 5580, cost: 1900, material: COTTON, short: "Худі та широкі штани з одного м'якого футеру.", tags: ["set", "lounge"] },
  { sku: "NF-ST-003", name: "Seamless Active Set", type: "set", category: "sets", subcategory: "sets", collections: ["summer"], colors: ["Green", "Blue"], price: 2990, cost: 980, flags: { isNew: true }, material: ACTIVE, short: "Безшовний комплект для тренувань у спеку.", tags: ["set", "seamless"] },
];

export function imageName(type: GarmentType, color: string, view: 0 | 1) {
  return `${type}-${color.toLowerCase()}-${view + 1}.webp`;
}

/** All (garment type → colours) combinations that need artwork. */
export const GARMENT_TYPES: Partial<Record<GarmentType, string[]>> = (() => {
  const map: Partial<Record<GarmentType, Set<string>>> = {};
  const add = (t: GarmentType, c: string) => ((map[t] ??= new Set()).add(c));
  for (const p of DEMO_PRODUCTS) for (const c of p.colors) add(p.type, c);
  for (const cat of DEMO_CATEGORIES) for (const ch of cat.children) if (ch.image) add(ch.image[0], ch.image[1]);
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v!]])) as Partial<Record<GarmentType, string[]>>;
})();
