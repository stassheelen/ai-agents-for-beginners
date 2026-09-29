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

/** `key` is the English id used in artwork file names; `name` is shown to shoppers. */
export const DEMO_COLORS = [
  { key: "Black", name: "Чорний", slug: "black", hex: "#1c1c1c" },
  { key: "White", name: "Білий", slug: "white", hex: "#f4f2ee" },
  { key: "Grey", name: "Сірий", slug: "grey", hex: "#a3a4a2" },
  { key: "Brown", name: "Коричневий", slug: "brown", hex: "#5e4436" },
  { key: "Beige", name: "Бежевий", slug: "beige", hex: "#d6c5ab" },
  { key: "Blue", name: "Блакитний", slug: "blue", hex: "#7b90a8" },
  { key: "Green", name: "Оливковий", slug: "green", hex: "#5f6549" },
];

export const APPAREL_SIZES = ["XS", "S", "M", "L", "XL"];

export type DemoProduct = {
  sku: string;
  name: string;
  /** English name used to build a stable, Latin URL slug */
  slugEn: string;
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
    name: "Спорт",
    slug: "active",
    nav: true,
    description: "Технічні речі для студії, залу та бігу — з підтримкою, що не відволікає.",
    children: [
      { name: "Спортивні топи", slug: "sports-bras", image: ["bra", "Green"] },
      { name: "Спортивні легінси", slug: "active-leggings", image: ["leggings", "Black"] },
      { name: "Велосипедки", slug: "bike-shorts", image: ["biker", "Brown"] },
    ],
  },
  {
    name: "Одяг",
    slug: "clothing",
    nav: true,
    description: "Базовий гардероб: худі, світшоти, футболки та штани на кожен день.",
    children: [
      { name: "Худі", slug: "hoodies", image: ["hoodie", "Brown"] },
      { name: "Світшоти", slug: "sweatshirts", image: ["sweatshirt", "Grey"] },
      { name: "Футболки", slug: "t-shirts", image: ["tee", "White"] },
      { name: "Топи", slug: "tops", image: ["tank", "Black"] },
      { name: "Легінси", slug: "leggings", image: ["leggings", "Brown"] },
      { name: "Штани", slug: "pants", image: ["pants", "Beige"] },
      { name: "Шорти", slug: "shorts", image: ["shorts", "Grey"] },
      { name: "Куртки", slug: "jackets", image: ["jacket", "Black"] },
    ],
  },
  {
    name: "Аксесуари",
    slug: "accessories",
    nav: true,
    description: "Деталі, що завершують образ.",
    children: [
      { name: "Сумки", slug: "bags", image: ["tote", "Beige"] },
      { name: "Кепки", slug: "caps", image: ["cap", "Green"] },
      { name: "Шкарпетки", slug: "socks", image: ["socks", "White"] },
      { name: "Інше", slug: "other-accessories", image: ["bottle", "Black"] },
    ],
  },
  {
    name: "Комплекти",
    slug: "sets",
    description: "Продумані комплекти — верх і низ, що створені одне для одного.",
    children: [],
  },
];

export const DEMO_COLLECTIONS = [
  { name: "Новий сезон", slug: "new-season", image: "/demo/editorial-new.webp", description: "Нові силуети сезону: чисті лінії, приглушені відтінки, м'які фактури." },
  { name: "Спорт-студія", slug: "active-studio", image: "/demo/editorial-active.webp", description: "Колекція для тренувань з високою посадкою, щільним трикотажем і нульовою прозорістю." },
  { name: "Базовий гардероб", slug: "essentials", image: "/demo/editorial-essentials.webp", description: "Речі, до яких повертаєшся щодня. Важкий бавовняний трикотаж і вільний крій." },
  { name: "Преміум", slug: "premium", image: "/demo/editorial-premium.webp", description: "Преміальні тканини та ретельне опрацювання деталей." },
  { name: "Літо", slug: "summer", image: "/demo/editorial-summer.webp", description: "Легкі речі для теплих днів у місті та на тренуванні." },
];

const COTTON = "80% бавовна, 20% поліестер. Щільність 380 г/м², начос всередині.";
const JERSEY = "100% органічна бавовна, 220 г/м².";
const ACTIVE = "76% поліамід, 24% еластан. Технологія швидкого висихання.";
const RIB = "92% бавовна, 8% еластан, рубчик 2×2.";

export const DEMO_PRODUCTS: DemoProduct[] = [
  // Hoodies
  { sku: "VL-HD-001", name: "Худі оверсайз з начосом", slugEn: "Oversized Fleece Hoodie", type: "hoodie", category: "clothing", subcategory: "hoodies", collections: ["essentials"], colors: ["Black", "Grey", "Brown"], price: 2890, cost: 1100, flags: { bestSeller: true, featured: true }, material: COTTON, short: "Об'ємне худі з м'яким начосом і подвійним капюшоном.", tags: ["hoodie", "fleece", "oversized"] },
  { sku: "VL-HD-002", name: "Худі на блискавці", slugEn: "Zip-Through Hoodie", type: "hoodie", category: "clothing", subcategory: "hoodies", collections: ["new-season"], colors: ["Black", "Beige"], price: 3190, cost: 1250, flags: { isNew: true }, material: COTTON, short: "Худі на двосторонній блискавці з металевою фурнітурою.", tags: ["hoodie", "zip"] },
  { sku: "VL-HD-003", name: "Укорочене худі Studio", slugEn: "Cropped Studio Hoodie", type: "hoodie", category: "clothing", subcategory: "hoodies", collections: ["active-studio"], colors: ["White", "Green"], price: 2590, cost: 980, flags: { isNew: true }, material: COTTON, short: "Укорочене худі для студії та міста.", tags: ["hoodie", "cropped"] },
  { sku: "VL-HD-004", name: "Щільне худі", slugEn: "Heavyweight Hoodie", type: "hoodie", category: "clothing", subcategory: "hoodies", collections: ["premium"], colors: ["Grey", "Blue"], price: 3490, compareAt: 3990, cost: 1400, material: "100% бавовна, 460 г/м².", short: "Щільне худі з важкого трикотажу, що тримає форму.", tags: ["hoodie", "heavyweight"] },
  // Sweatshirts
  { sku: "VL-SW-001", name: "Класичний світшот", slugEn: "Classic Crew Sweatshirt", type: "sweatshirt", category: "clothing", subcategory: "sweatshirts", collections: ["essentials"], colors: ["Grey", "Black", "Beige"], price: 2390, cost: 900, flags: { bestSeller: true }, material: COTTON, short: "Класичний світшот з круглим вирізом та рубчастими манжетами.", tags: ["sweatshirt", "crew"] },
  { sku: "VL-SW-002", name: "Світшот з коротким замком", slugEn: "Boxy Half-Zip Sweatshirt", type: "sweatshirt", category: "clothing", subcategory: "sweatshirts", collections: ["new-season"], colors: ["Brown", "White"], price: 2790, cost: 1050, flags: { isNew: true, featured: true }, material: COTTON, short: "Прямий силует і коротка блискавка біля горловини.", tags: ["sweatshirt", "half-zip"] },
  { sku: "VL-SW-003", name: "Світшот з брашованої бавовни", slugEn: "Brushed Cotton Sweatshirt", type: "sweatshirt", category: "clothing", subcategory: "sweatshirts", collections: ["summer"], colors: ["Green", "Blue"], price: 2490, compareAt: 2990, cost: 950, material: COTTON, short: "М'який брашований трикотаж для прохолодних вечорів.", tags: ["sweatshirt"] },
  // T-shirts
  { sku: "VL-TS-001", name: "Базова футболка", slugEn: "Essential Crew Tee", type: "tee", category: "clothing", subcategory: "t-shirts", collections: ["essentials"], colors: ["White", "Black", "Grey"], price: 990, cost: 320, flags: { bestSeller: true }, material: JERSEY, short: "Базова футболка з щільного органічного бавовняного джерсі.", tags: ["tee", "t-shirt", "basic"] },
  { sku: "VL-TS-002", name: "Щільна футболка оверсайз", slugEn: "Oversized Heavy Tee", type: "tee", category: "clothing", subcategory: "t-shirts", collections: ["premium"], colors: ["Black", "Beige", "Brown"], price: 1290, cost: 430, flags: { featured: true }, material: "100% бавовна, 280 г/м².", short: "Вільна футболка зі спущеною лінією плеча.", tags: ["tee", "oversized"] },
  { sku: "VL-TS-003", name: "Приталена футболка в рубчик", slugEn: "Fitted Rib Tee", type: "tee", category: "clothing", subcategory: "t-shirts", collections: ["summer"], colors: ["White", "Blue"], price: 1090, cost: 360, flags: { isNew: true }, material: RIB, short: "Приталена футболка з еластичного рубчика.", tags: ["tee", "rib", "fitted"] },
  { sku: "VL-TS-004", name: "Лонгслів Studio", slugEn: "Long Sleeve Studio Tee", type: "longsleeve", category: "clothing", subcategory: "t-shirts", collections: ["active-studio"], colors: ["Black", "Green"], price: 1390, cost: 480, material: ACTIVE, short: "Лонгслів з технічної тканини для тренувань.", tags: ["longsleeve", "active"] },
  // Tops
  { sku: "VL-TP-001", name: "Безшовна майка", slugEn: "Seamless Tank Top", type: "tank", category: "clothing", subcategory: "tops", collections: ["active-studio"], colors: ["Black", "White", "Brown"], price: 1190, cost: 400, flags: { isNew: true }, material: ACTIVE, short: "Безшовна майка, що сідає як друга шкіра.", tags: ["tank", "seamless", "top"] },
  { sku: "VL-TP-002", name: "Укорочений топ у рубчик", slugEn: "Ribbed Crop Top", type: "crop", category: "clothing", subcategory: "tops", collections: ["summer"], colors: ["Grey", "Beige"], price: 1090, compareAt: 1390, cost: 350, material: RIB, short: "Укорочений топ із рубчика з коротким рукавом.", tags: ["crop", "top", "rib"] },
  { sku: "VL-TP-003", name: "Топ із запахом", slugEn: "Wrap Long Sleeve Top", type: "longsleeve", category: "clothing", subcategory: "tops", collections: ["premium"], colors: ["Black", "Blue"], price: 1590, cost: 560, material: ACTIVE, short: "Топ із запахом та довгим рукавом.", tags: ["top", "wrap"] },
  // Sports bras
  { sku: "VL-BR-001", name: "Спортивний топ Sculpt", slugEn: "Sculpt Sports Bra", type: "bra", category: "active", subcategory: "sports-bras", collections: ["active-studio"], colors: ["Black", "Brown", "Green"], price: 1390, cost: 450, flags: { bestSeller: true }, material: ACTIVE, short: "Бра середньої підтримки зі знімними чашками.", tags: ["bra", "sports bra", "active"] },
  { sku: "VL-BR-002", name: "Спортивний топ з перехресною спинкою", slugEn: "Cross-Back Bra", type: "bra", category: "active", subcategory: "sports-bras", collections: ["new-season"], colors: ["White", "Blue"], price: 1290, cost: 420, flags: { isNew: true }, material: ACTIVE, short: "Перехресні бретелі на спині та м'яка підтримка.", tags: ["bra", "cross-back"] },
  { sku: "VL-BR-003", name: "Спортивний топ високої підтримки", slugEn: "High Support Bra", type: "bra", category: "active", subcategory: "sports-bras", collections: ["premium"], colors: ["Black", "Grey"], price: 1590, cost: 520, flags: { featured: true }, material: ACTIVE, short: "Висока підтримка для бігу та інтенсивних тренувань.", tags: ["bra", "high support"] },
  // Leggings
  { sku: "VL-LG-001", name: "Легінси Sculpt з високою посадкою", slugEn: "Sculpt High-Rise Leggings", type: "leggings", category: "active", subcategory: "active-leggings", collections: ["active-studio"], colors: ["Black", "Brown", "Green", "Blue"], price: 2190, cost: 700, flags: { bestSeller: true, featured: true }, material: ACTIVE, short: "Легінси з високою посадкою та моделюючим поясом.", tags: ["leggings", "high-rise", "active"] },
  { sku: "VL-LG-002", name: "Легінси кльош", slugEn: "Flared Leggings", type: "leggings", category: "clothing", subcategory: "leggings", collections: ["new-season"], colors: ["Black", "Grey"], price: 2290, cost: 740, flags: { isNew: true }, material: ACTIVE, short: "Легінси-кльош з м'якого еластичного трикотажу.", tags: ["leggings", "flared"] },
  { sku: "VL-LG-003", name: "Безшовні легінси в рубчик", slugEn: "Seamless Rib Leggings", type: "leggings", category: "clothing", subcategory: "leggings", collections: ["essentials"], colors: ["Beige", "Brown"], price: 1990, compareAt: 2490, cost: 640, material: RIB, short: "Безшовні легінси з рубчастою текстурою.", tags: ["leggings", "seamless", "rib"] },
  { sku: "VL-LG-004", name: "Легінси 7/8 з кишенями", slugEn: "Pocket Leggings 7/8", type: "leggings", category: "active", subcategory: "active-leggings", collections: ["premium"], colors: ["Black", "Blue"], price: 2390, cost: 780, material: ACTIVE, short: "Довжина 7/8 та бічні кишені для телефону.", tags: ["leggings", "pockets"] },
  // Pants
  { sku: "VL-PT-001", name: "Широкі спортивні штани", slugEn: "Wide-Leg Sweatpants", type: "pants", category: "clothing", subcategory: "pants", collections: ["essentials"], colors: ["Grey", "Black", "Beige"], price: 2590, cost: 950, flags: { bestSeller: true }, material: COTTON, short: "Широкі спортивні штани з високою посадкою.", tags: ["pants", "sweatpants", "wide-leg"] },
  { sku: "VL-PT-002", name: "Джогери зі стрілкою", slugEn: "Tailored Jogger", type: "pants", category: "clothing", subcategory: "pants", collections: ["premium"], colors: ["Black", "Brown"], price: 2790, cost: 1020, material: "72% віскоза, 24% поліамід, 4% еластан.", short: "Джогери з акуратною стрілкою та прихованими кишенями.", tags: ["pants", "jogger"] },
  { sku: "VL-PT-003", name: "Прямі трекові штани", slugEn: "Straight Track Pants", type: "pants", category: "clothing", subcategory: "pants", collections: ["new-season"], colors: ["Blue", "White"], price: 2490, cost: 900, flags: { isNew: true }, material: "100% поліамід.", short: "Прямі трекові штани з легкої тканини.", tags: ["pants", "track"] },
  // Shorts
  { sku: "VL-SH-001", name: "Велосипедки", slugEn: "Biker Shorts", type: "biker", category: "active", subcategory: "bike-shorts", collections: ["active-studio"], colors: ["Black", "Brown", "Green"], price: 1290, cost: 420, flags: { bestSeller: true }, material: ACTIVE, short: "Велосипедки з високою посадкою та плоскими швами.", tags: ["shorts", "biker"] },
  { sku: "VL-SH-002", name: "Шорти з футеру", slugEn: "Sweat Shorts", type: "shorts", category: "clothing", subcategory: "shorts", collections: ["summer"], colors: ["Grey", "Beige"], price: 1390, compareAt: 1690, cost: 480, material: COTTON, short: "Шорти з м'якого футеру з кулісою.", tags: ["shorts", "sweat"] },
  { sku: "VL-SH-003", name: "Шорти для бігу", slugEn: "Running Shorts", type: "shorts", category: "clothing", subcategory: "shorts", collections: ["summer"], colors: ["Black", "Blue"], price: 1190, cost: 390, flags: { isNew: true }, material: "100% поліестер, вбудовані велосипедки.", short: "Легкі шорти для бігу з внутрішнім шаром.", tags: ["shorts", "running"] },
  // Jackets
  { sku: "VL-JK-001", name: "Легка трекова куртка", slugEn: "Lightweight Track Jacket", type: "jacket", category: "clothing", subcategory: "jackets", collections: ["new-season"], colors: ["Black", "Green"], price: 3590, cost: 1400, flags: { isNew: true, featured: true }, material: "100% переробений поліамід.", short: "Легка трекова куртка з вітрозахисної тканини.", tags: ["jacket", "track"] },
  { sku: "VL-JK-002", name: "Сорочка-куртка", slugEn: "Structured Overshirt Jacket", type: "jacket", category: "clothing", subcategory: "jackets", collections: ["premium"], colors: ["Brown", "Black"], price: 4290, cost: 1700, material: "60% бавовна, 40% вовна.", short: "Сорочка-куртка з щільної вовняної суміші.", tags: ["jacket", "overshirt"] },
  { sku: "VL-JK-003", name: "Флісова куртка на блискавці", slugEn: "Fleece Zip Jacket", type: "jacket", category: "clothing", subcategory: "jackets", collections: ["essentials"], colors: ["Beige", "Grey"], price: 3890, compareAt: 4490, cost: 1500, material: "100% поліестер, фліс 300 г/м².", short: "Теплий фліс на блискавці з високим коміром.", tags: ["jacket", "fleece"] },
  // Accessories
  { sku: "VL-BG-001", name: "Шопер з канвасу", slugEn: "Canvas Tote Bag", type: "tote", category: "accessories", subcategory: "bags", collections: ["essentials"], colors: ["Beige", "Black"], price: 1490, cost: 420, sizes: ["ONE SIZE"], material: "100% бавовняний канвас, 16 oz.", short: "Місткий шопер з внутрішньою кишенею.", tags: ["bag", "tote"] },
  { sku: "VL-BG-002", name: "Спортивна сумка", slugEn: "Gym Duffel Bag", type: "duffel", category: "accessories", subcategory: "bags", collections: ["active-studio"], colors: ["Black", "Brown"], price: 2890, cost: 980, flags: { featured: true }, sizes: ["ONE SIZE"], material: "Водовідштовхувальний нейлон.", short: "Спортивна сумка з відділенням для взуття.", tags: ["bag", "duffel", "gym"] },
  { sku: "VL-CP-001", name: "Кепка з вареної бавовни", slugEn: "Washed Cotton Cap", type: "cap", category: "accessories", subcategory: "caps", collections: ["essentials"], colors: ["Black", "Beige", "Green", "Blue"], price: 790, cost: 220, flags: { bestSeller: true }, sizes: ["ONE SIZE"], material: "100% бавовна з ефектом вареної тканини.", short: "Кепка з вигнутим козирком і регульованим ремінцем.", tags: ["cap", "hat"] },
  { sku: "VL-CP-002", name: "Спортивна кепка з нейлону", slugEn: "Nylon Sport Cap", type: "cap", category: "accessories", subcategory: "caps", collections: ["summer"], colors: ["White", "Black"], price: 890, cost: 260, flags: { isNew: true }, sizes: ["ONE SIZE"], material: "Легкий нейлон, швидко висихає.", short: "Легка кепка для бігу.", tags: ["cap", "running"] },
  { sku: "VL-SK-001", name: "Високі шкарпетки, 3 пари", slugEn: "Crew Socks 3-Pack", type: "socks", category: "accessories", subcategory: "socks", collections: ["essentials"], colors: ["White", "Black", "Grey"], price: 490, cost: 140, flags: { bestSeller: true }, sizes: ["36-38", "39-41", "42-44"], material: "80% бавовна, 18% поліамід, 2% еластан.", short: "Набір із трьох пар високих шкарпеток.", tags: ["socks"] },
  { sku: "VL-SK-002", name: "Короткі спортивні шкарпетки", slugEn: "Sport Ankle Socks", type: "socks", category: "accessories", subcategory: "socks", collections: ["active-studio"], colors: ["White", "Green"], price: 390, compareAt: 490, cost: 110, sizes: ["36-38", "39-41", "42-44"], material: "Бавовна з анатомічною підтримкою стопи.", short: "Короткі спортивні шкарпетки.", tags: ["socks", "sport"] },
  { sku: "VL-AC-001", name: "Термопляшка зі сталі", slugEn: "Steel Water Bottle", type: "bottle", category: "accessories", subcategory: "other-accessories", collections: ["active-studio"], colors: ["Black", "White"], price: 690, cost: 210, sizes: ["ONE SIZE"], material: "Нержавіюча сталь, 750 мл, подвійні стінки.", short: "Термопляшка, що тримає холод до 24 годин.", tags: ["bottle", "accessories"] },
  // Sets
  { sku: "VL-ST-001", name: "Комплект Sculpt Studio", slugEn: "Sculpt Studio Set", type: "set", category: "sets", subcategory: "sets", collections: ["active-studio", "new-season"], colors: ["Black", "Brown"], price: 3290, cost: 1100, flags: { isNew: true, featured: true }, material: ACTIVE, short: "Комплект: бра середньої підтримки та легінси з високою посадкою.", tags: ["set", "active"] },
  { sku: "VL-ST-002", name: "Домашній комплект", slugEn: "Lounge Set", type: "lounge", category: "sets", subcategory: "sets", collections: ["essentials"], colors: ["Grey", "Beige"], price: 4990, compareAt: 5580, cost: 1900, material: COTTON, short: "Худі та широкі штани з одного м'якого футеру.", tags: ["set", "lounge"] },
  { sku: "VL-ST-003", name: "Безшовний спортивний комплект", slugEn: "Seamless Active Set", type: "set", category: "sets", subcategory: "sets", collections: ["summer"], colors: ["Green", "Blue"], price: 2990, cost: 980, flags: { isNew: true }, material: ACTIVE, short: "Безшовний комплект для тренувань у спеку.", tags: ["set", "seamless"] },
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
