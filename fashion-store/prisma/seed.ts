/**
 * Demo seed. Safe to run repeatedly:
 *  - always ensures Settings + the admin user from ADMIN_EMAIL / ADMIN_PASSWORD
 *  - loads the demo catalogue only when the database has no products
 *    (on Vercel builds additionally only when SEED_DEMO=1),
 *    or when SEED_RESET=1 is set (wipes catalogue, orders and content first).
 */
import { PrismaClient, type OrderStatus, type SectionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  APPAREL_SIZES,
  DEMO_CATEGORIES,
  DEMO_COLLECTIONS,
  DEMO_COLORS,
  DEMO_PRODUCTS,
  imageName,
} from "./demo-data";

const prisma = new PrismaClient();

let seedState = 42;
function rand() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const colorUk = (key: string) => DEMO_COLORS.find((c) => c.key === key)!.name;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const COLOR_CODE: Record<string, string> = { Black: "BLK", White: "WHT", Grey: "GRY", Brown: "BRN", Beige: "BGE", Blue: "BLU", Green: "GRN" };

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("⚠ ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin user creation");
    return;
  }
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, active: true },
    create: { email, passwordHash, name: "Адміністратор", role: "OWNER" },
  });
  console.log(`✓ Admin user: ${email}`);
}

async function ensureSettings() {
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      storeName: "VELLA",
      tagline: "Одяг для руху та щоденного життя",
      accentColor: "#1f1f1f",
      currency: "UAH",
      freeShippingThreshold: 200000,
      shippingFlatRate: 9000,
      contactEmail: "hello@vella.store",
      contactPhone: "+380 44 000 00 00",
      instagramUrl: "https://instagram.com/",
      seoTitle: "VELLA — сучасний activewear та базовий гардероб",
      seoDescription: "Мінімалістичний одяг для тренувань і щоденного життя. Легінси, худі, світшоти, бра та аксесуари з доставкою по Україні.",
      ogImage: "/demo/og-default.webp",
      sizeGuide:
        "XS — груди 78–82 см, талія 60–64 см, стегна 86–90 см\nS — груди 82–86 см, талія 64–68 см, стегна 90–94 см\nM — груди 86–90 см, талія 68–72 см, стегна 94–98 см\nL — груди 90–96 см, талія 72–78 см, стегна 98–104 см\nXL — груди 96–102 см, талія 78–84 см, стегна 104–110 см",
      deliveryInfo:
        "Доставляємо Новою Поштою по всій Україні за 1–3 дні. Безкоштовна доставка для замовлень від 2000 ₴. Відправка в день замовлення, якщо ви оформили його до 14:00.",
      returnsInfo:
        "Ви можете повернути або обміняти товар протягом 14 днів з моменту отримання, якщо він не був у використанні та має всі бірки. Повернення коштів — протягом 3 робочих днів.",
    },
  });
}

async function reset() {
  console.log("… clearing demo data");
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.wishlist.deleteMany(),
    prisma.review.deleteMany(),
    prisma.productCategory.deleteMany(),
    prisma.productCollection.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.updateMany({ data: { parentId: null } }),
    prisma.category.deleteMany(),
    prisma.collection.deleteMany(),
    prisma.color.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.homepageSection.deleteMany(),
    prisma.promotion.deleteMany(),
    prisma.media.deleteMany(),
  ]);
}

async function seedCatalog() {
  // Colours
  const colors = new Map<string, string>();
  for (const [i, c] of DEMO_COLORS.entries()) {
    const row = await prisma.color.create({ data: { name: c.name, slug: c.slug, hex: c.hex, position: i } });
    colors.set(c.key, row.id);
  }

  // Categories
  const categories = new Map<string, string>();
  for (const [i, cat] of DEMO_CATEGORIES.entries()) {
    const parent = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        showInNav: Boolean(cat.nav),
        position: i,
        image: cat.children[0]?.image ? `/demo/${imageName(cat.children[0].image[0], cat.children[0].image[1], 0)}` : "/demo/set-black-1.webp",
        seoTitle: `${cat.name} — VELLA`,
        seoDescription: cat.description,
      },
    });
    categories.set(cat.slug, parent.id);
    for (const [j, child] of cat.children.entries()) {
      const row = await prisma.category.create({
        data: {
          name: child.name,
          slug: child.slug,
          parentId: parent.id,
          position: j,
          image: child.image ? `/demo/${imageName(child.image[0], child.image[1], 0)}` : null,
          description: `${child.name} від VELLA.`,
        },
      });
      categories.set(child.slug, row.id);
    }
  }

  // Collections
  const collections = new Map<string, string>();
  for (const [i, c] of DEMO_COLLECTIONS.entries()) {
    const row = await prisma.collection.create({
      data: { name: c.name, slug: c.slug, description: c.description, heroImage: c.image, position: i, seoTitle: `${c.name} — VELLA`, seoDescription: c.description },
    });
    collections.set(c.slug, row.id);
  }

  // Products
  const now = Date.now();
  const productIds: { id: string; variants: { id: string; sku: string; size: string | null; color: string }[]; p: (typeof DEMO_PRODUCTS)[number] }[] = [];
  for (const [index, p] of DEMO_PRODUCTS.entries()) {
    const sizes = p.sizes ?? APPAREL_SIZES;
    const createdAt = new Date(now - (DEMO_PRODUCTS.length - index) * 36 * 3600 * 1000 - (p.flags?.isNew ? 0 : 20 * 86400000));
    const productSlug = slug(p.slugEn);
    const categoryId = categories.get(p.category)!;
    const subcategoryId = p.subcategory !== p.category ? categories.get(p.subcategory) : undefined;
    const images: { url: string; alt: string; colorName: string; position: number }[] = [];
    p.colors.forEach((color, ci) => {
      const uk = colorUk(color);
      images.push({ url: `/demo/${imageName(p.type, color, 0)}`, alt: `${p.name} — ${uk}`, colorName: uk, position: ci * 2 });
      images.push({ url: `/demo/${imageName(p.type, color, 1)}`, alt: `${p.name} — ${uk}, деталь`, colorName: uk, position: ci * 2 + 1 });
    });
    // gallery order: first colour front, first colour detail, then other colours
    const variants = p.colors.flatMap((color, ci) =>
      sizes.map((size, si) => {
        const r = rand();
        const stock = r < 0.08 ? 0 : r < 0.18 ? Math.ceil(rand() * 4) : 6 + Math.floor(rand() * 30);
        return {
          sku: `${p.sku}-${COLOR_CODE[color]}-${size.replace(/[^A-Z0-9]/gi, "").toUpperCase()}`,
          colorId: colors.get(color)!,
          size,
          stock,
          position: ci * 10 + si,
        };
      }),
    );
    const product = await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        slug: productSlug,
        brand: "VELLA",
        shortDescription: p.short,
        description: `${p.short} Модель створена в нашій студії з увагою до посадки та відчуттів на тілі. Універсальна річ, яку легко поєднувати з рештою гардероба — від тренування до вечері.`,
        details: "• Вільна / анатомічна посадка залежно від моделі\n• Плоскі шви, що не натирають\n• Виготовлено в Україні\n• Модель на фото: зріст 172 см, розмір S",
        material: p.material,
        careInstructions: "Прання при 30°C з подібними кольорами. Не використовувати відбілювач. Не сушити в барабані. Прасувати на низькій температурі навиворіт.",
        shippingInfo: "Відправка протягом 24 годин. Нова Пошта 1–3 дні.",
        returnInfo: "Безкоштовне повернення протягом 14 днів.",
        categoryId,
        subcategoryId,
        price: p.price * 100,
        compareAtPrice: p.compareAt ? p.compareAt * 100 : null,
        costPrice: p.cost * 100,
        currency: "UAH",
        status: "PUBLISHED",
        publishedAt: createdAt,
        featured: Boolean(p.flags?.featured),
        isNew: Boolean(p.flags?.isNew),
        bestSeller: Boolean(p.flags?.bestSeller),
        onSale: Boolean(p.compareAt),
        tags: p.tags,
        seoTitle: `${p.name} — VELLA`,
        seoDescription: p.short,
        createdAt,
        images: { create: images },
        variants: { create: variants },
        categories: {
          create: [categoryId, subcategoryId].filter(Boolean).map((id) => ({ categoryId: id! })),
        },
        collections: { create: p.collections.map((c, i) => ({ collectionId: collections.get(c)!, position: index * 10 + i })) },
      },
      include: { variants: { include: { color: true } } },
    });
    productIds.push({ id: product.id, p, variants: product.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size, color: DEMO_COLORS.find((c) => c.name === v.color!.name)!.key })) });
  }
  console.log(`✓ ${DEMO_PRODUCTS.length} products`);

  // Reviews
  const names = ["Олена", "Марія", "Анна", "Катерина", "Софія", "Ірина", "Дарина", "Юлія", "Вікторія", "Тетяна"];
  const bodies = [
    "Дуже приємна тканина, посадка ідеальна. Беру вже другий колір.",
    "Якість на висоті, після кількох прань виглядає як нова.",
    "Розмір відповідає сітці, рекомендую брати свій.",
    "Тримає форму і не просвічує. Для тренувань — те, що треба.",
    "Колір трохи темніший, ніж на фото, але все одно дуже гарно.",
    "Швидка доставка, акуратна упаковка. Задоволена покупкою!",
  ];
  for (const { id } of productIds) {
    const count = 1 + Math.floor(rand() * 5);
    const ratings: number[] = [];
    for (let i = 0; i < count; i++) {
      const rating = rand() < 0.75 ? 5 : 4;
      ratings.push(rating);
      await prisma.review.create({
        data: { productId: id, name: pick(names), rating, body: pick(bodies), size: pick(["XS", "S", "M", "L"]), status: "APPROVED", createdAt: new Date(now - rand() * 60 * 86400000) },
      });
    }
    await prisma.product.update({
      where: { id },
      data: { reviewCount: count, rating: Math.round((ratings.reduce((a, b) => a + b, 0) / count) * 10) / 10 },
    });
  }
  await prisma.review.create({ data: { productId: productIds[0].id, name: "Наталія", rating: 4, body: "Чекаю на відповідь щодо розмірної сітки, взагалі дуже подобається.", status: "PENDING" } });
  await prisma.review.create({ data: { productId: productIds[5].id, name: "Оксана", rating: 5, title: "Найкраще худі", body: "Тепле і дуже м'яке всередині.", status: "PENDING" } });

  // Customers & orders
  const customers = [
    ["Олена", "Коваль", "olena.koval@example.com", "Київ"],
    ["Марія", "Шевченко", "maria.shev@example.com", "Львів"],
    ["Анна", "Бондаренко", "anna.b@example.com", "Одеса"],
    ["Катерина", "Мельник", "k.melnyk@example.com", "Дніпро"],
    ["Софія", "Ткаченко", "sofia.t@example.com", "Харків"],
    ["Ірина", "Кравченко", "iryna.k@example.com", "Київ"],
    ["Дарина", "Олійник", "daryna.o@example.com", "Вінниця"],
    ["Юлія", "Савченко", "yulia.s@example.com", "Київ"],
    ["Вікторія", "Руденко", "vika.r@example.com", "Львів"],
    ["Тетяна", "Лисенко", "tetiana.l@example.com", "Запоріжжя"],
    ["Андрій", "Мороз", "andrii.m@example.com", "Київ"],
    ["Максим", "Павленко", "max.p@example.com", "Полтава"],
  ];
  const statuses: OrderStatus[] = ["NEW", "NEW", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "CANCELLED", "RETURNED"];
  const customerRows = [];
  for (const [first, last, email, city] of customers) {
    customerRows.push(
      await prisma.customer.create({ data: { firstName: first, lastName: last, email, city, phone: `+38067${Math.floor(1000000 + rand() * 8999999)}` } }),
    );
  }
  const salesByProduct = new Map<string, number>();
  for (let i = 0; i < 48; i++) {
    const customer = pick(customerRows);
    const daysAgo = Math.floor(Math.pow(rand(), 1.6) * 360);
    const createdAt = new Date(now - daysAgo * 86400000 - rand() * 86400000);
    const lines = 1 + Math.floor(rand() * 3);
    const items = [];
    for (let l = 0; l < lines; l++) {
      const prod = pick(productIds);
      const variant = pick(prod.variants);
      const qty = rand() < 0.8 ? 1 : 2;
      const unit = prod.p.price * 100;
      items.push({
        productId: prod.id,
        variantId: variant.id,
        name: prod.p.name,
        sku: variant.sku,
        color: colorUk(variant.color),
        size: variant.size,
        image: `/demo/${imageName(prod.p.type, variant.color, 0)}`,
        unitPrice: unit,
        quantity: qty,
        total: unit * qty,
      });
    }
    const subtotal = items.reduce((a, b) => a + b.total, 0);
    const shippingCost = subtotal >= 200000 ? 0 : 9000;
    const status = daysAgo > 14 ? pick(["DELIVERED", "DELIVERED", "DELIVERED", "CANCELLED", "RETURNED"] as OrderStatus[]) : pick(statuses);
    const paymentMethod = rand() < 0.55 ? "card" : "cod";
    const paid = status === "DELIVERED" || (paymentMethod === "card" && !["CANCELLED", "NEW"].includes(status));
    await prisma.order.create({
      data: {
        customerId: customer.id,
        email: customer.email,
        phone: customer.phone!,
        firstName: customer.firstName,
        lastName: customer.lastName ?? "",
        status,
        paymentMethod,
        paymentProvider: paymentMethod === "card" ? "manual" : "cod",
        paymentStatus: status === "RETURNED" ? "REFUNDED" : paid ? "PAID" : "PENDING",
        deliveryMethod: "nova_poshta_branch",
        deliveryProvider: "nova_poshta",
        city: customer.city!,
        deliveryAddress: `Відділення №${1 + Math.floor(rand() * 60)}`,
        subtotal,
        shippingCost,
        total: subtotal + shippingCost,
        createdAt,
        items: { create: items },
      },
    });
    if (status !== "CANCELLED") {
      for (const it of items) salesByProduct.set(it.productId, (salesByProduct.get(it.productId) ?? 0) + it.quantity);
      await prisma.customer.update({
        where: { id: customer.id },
        data: { ordersCount: { increment: 1 }, totalSpent: { increment: subtotal + shippingCost } },
      });
    }
  }
  for (const [id, n] of salesByProduct) {
    const base = DEMO_PRODUCTS.find((p) => productIds.find((x) => x.id === id)?.p === p)?.flags?.bestSeller ? 40 : 0;
    await prisma.product.update({ where: { id }, data: { salesCount: n + base } });
  }
  console.log("✓ customers, orders, reviews");

  // Banners
  await prisma.banner.createMany({
    data: [
      { placement: "ANNOUNCEMENT", title: "Безкоштовна доставка від 2000 ₴", link: "/help/delivery", position: 0 },
      { placement: "ANNOUNCEMENT", title: "−10% на перше замовлення з кодом WELCOME10", link: "/shop", position: 1 },
      { placement: "ANNOUNCEMENT", title: "Обмін та повернення протягом 14 днів", link: "/help/returns", position: 2 },
      { placement: "MEGA_MENU", title: "Спорт-студія", subtitle: "Нова колекція для тренувань", image: "/demo/editorial-active.webp", link: "/collections/active-studio", buttonLabel: "Дивитись", position: 0 },
      { placement: "MEGA_MENU", title: "Базовий гардероб", subtitle: "Щоденна база", image: "/demo/editorial-essentials.webp", link: "/collections/essentials", buttonLabel: "Дивитись", position: 1 },
      { placement: "CATALOG", title: "Знижки до −30%", subtitle: "Останні розміри улюблених моделей", image: "/demo/banner-sale.webp", link: "/shop?flag=sale", buttonLabel: "До розпродажу", position: 0 },
      { placement: "HOMEPAGE", title: "Мінус 10% на перше замовлення", subtitle: "Промокод WELCOME10 у кошику", image: "/demo/banner-sale.webp", link: "/shop", buttonLabel: "Почати покупки", position: 0 },
    ],
  });

  // Homepage
  const sections: { type: SectionType; [k: string]: unknown }[] = [
    {
      type: "HERO",
      label: "Нова колекція",
      title: "Осінь 2026",
      subtitle: "Худі з начосом, флісові куртки та широкі штани в коричневих, бежевих і оливкових відтінках.",
      image: "/demo/hero-desktop.webp",
      mobileImage: "/demo/hero-mobile.webp",
      buttonLabel: "Дивитись колекцію",
      buttonLink: "/collections/new-season",
      button2Label: "Усі новинки",
      button2Link: "/shop?flag=new",
      textColor: "#111111",
      config: { align: "left", height: "full" },
    },
    { type: "PRODUCT_CAROUSEL", title: "Новинки та тренди", subtitle: "Те, що обирають цього тижня", buttonLabel: "Дивитись усе", buttonLink: "/shop?flag=new", config: { source: "new", limit: 10 } },
    { type: "CATEGORY_GRID", title: "Категорії", config: { slugs: ["hoodies", "leggings", "sports-bras", "sweatshirts", "pants", "caps"] } },
    { type: "PRODUCT_GRID", title: "Бестселери", subtitle: "Моделі, до яких повертаються", buttonLabel: "Усі бестселери", buttonLink: "/shop?flag=bestseller", config: { source: "bestseller", limit: 8 } },
    {
      type: "IMAGE_TEXT",
      label: "Спорт-студія",
      title: "Створено для студії. Залишається з вами на весь день.",
      body: "Нульова прозорість, моделюючий пояс і тканина, що висихає за хвилини. Колекція «Спорт-студія» — для тих, хто рухається у власному темпі.",
      image: "/demo/editorial-active.webp",
      buttonLabel: "Дослідити колекцію",
      buttonLink: "/collections/active-studio",
      background: "#f3f1ec",
      config: { layout: "left" },
    },
    { type: "PRODUCT_CAROUSEL", title: "Нові надходження", buttonLabel: "Всі новинки", buttonLink: "/shop?sort=newest", config: { source: "latest", limit: 10 } },
    { type: "COLLECTION", title: "Колекції", subtitle: "Колекції з власним характером", config: {} },
    { type: "BANNER", title: "Знижки до −30%", subtitle: "Останні розміри улюблених моделей — поки вони є.", image: "/demo/banner-sale.webp", buttonLabel: "До розпродажу", buttonLink: "/shop?flag=sale", textColor: "#ffffff", config: {} },
    { type: "PRODUCT_CAROUSEL", title: "Розпродаж", buttonLabel: "Усі знижки", buttonLink: "/shop?flag=sale", config: { source: "sale", limit: 10 } },
  ];
  for (const [i, s] of sections.entries()) {
    await prisma.homepageSection.create({ data: { ...(s as { type: SectionType }), position: i } });
  }

  await prisma.promotion.createMany({
    data: [
      { code: "WELCOME10", description: "−10% на перше замовлення", type: "PERCENTAGE", value: 10, minSubtotal: 0 },
      { code: "FREESHIP", description: "Безкоштовна доставка", type: "FREE_SHIPPING", value: 0, minSubtotal: 100000 },
      { code: "MINUS300", description: "−300 ₴ від 3000 ₴", type: "FIXED", value: 30000, minSubtotal: 300000 },
    ],
  });

  // Register demo imagery in the media library
  const mediaUrls = new Set<string>();
  for (const p of DEMO_PRODUCTS) for (const c of p.colors) mediaUrls.add(`/demo/${imageName(p.type, c, 0)}`);
  ["hero-desktop", "hero-mobile", "editorial-active", "editorial-essentials", "editorial-premium", "editorial-summer", "editorial-new", "banner-sale"].forEach((n) => mediaUrls.add(`/demo/${n}.webp`));
  await prisma.media.createMany({
    data: [...mediaUrls].map((url) => ({ url, filename: url.split("/").pop()!, mimeType: "image/webp", type: "IMAGE" as const, pathname: url })),
  });
  console.log("✓ banners, homepage, promotions, media");
}

async function main() {
  await ensureSettings();
  await ensureAdmin();
  // On Vercel builds the demo catalogue is only loaded when SEED_DEMO=1 (first deploy).
  if (process.env.VERCEL && process.env.SEED_DEMO !== "1") {
    console.log("Vercel build: SEED_DEMO is not 1 — demo catalogue skipped (admin/settings ensured).");
    return;
  }
  const existing = await prisma.product.count();
  if (existing > 0 && process.env.SEED_RESET !== "1") {
    console.log(`Catalogue already has ${existing} products — skipping demo data (set SEED_RESET=1 to reload).`);
    return;
  }
  if (existing > 0 || process.env.SEED_RESET === "1") await reset();
  await seedCatalog();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
