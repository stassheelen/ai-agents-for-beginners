# NORDFORM — premium fashion / activewear e-commerce

A working e-commerce store built with Next.js (App Router) + PostgreSQL + Prisma, with a full admin panel. Every piece of content (products, categories, collections, homepage, banners, orders, settings) lives in the database, and the admin panel manages all of it.

> The design is original. It takes the UX level of premium fashion brands as a reference but copies no design, copy, logos or photos. All demo images are generated procedurally by `scripts/generate-demo-images.ts`, so there are no third-party photos.

---

## Features

**Storefront**
- Editorial homepage, fully driven by the CMS (Hero, product carousel/grid, category grid, image + text, banner, collections, video, text)
- Announcement bar (rotates messages from the Banners section) and a sticky header with a **mega menu** (New / Shop / Active / Clothing / Accessories / Sale + Shop by color). On mobile, the mega menu becomes an accordion
- Catalog at `/shop`, `/shop/[category]` and `/collections/[slug]` with **real database filters**: category, size, color, price, collection, availability. Sorting: Featured / Newest / Price ↑ / Price ↓ / Best selling. Load more / infinite scroll; 4/3/2 columns
- Product card: second image on hover, color swatches (swap the photo), NEW / BESTSELLER / SALE badges, rating, old price, **Quick Add** (drawer on desktop, bottom sheet on mobile)
- Product page `/products/[slug]`: gallery (swipeable on mobile), per-color photos, color and size selection with per-variant stock, size guide, Add to bag / Buy now, wishlist, accordions (description, details, material, care, sizing, delivery, returns), reviews with a submission form (moderated), You may also like, Recently viewed, and a sticky Add to bag on mobile
- Cart drawer (server-side cart keyed by a cookie): quantity, remove, move to wishlist, free-shipping progress bar
- Checkout: contact details, Nova Poshta (branch or courier), payment by card or cash on delivery, promo codes, atomic stock reservation, confirmation page
- Wishlist (`/wishlist`), search overlay with suggestions plus a `/search` page (name, SKU, category, collection, color, tags), order tracking (`/account`), help pages, 404
- SEO: metadata / OG for products, categories and collections; `sitemap.xml`, `robots.txt`; JSON-LD for Product, BreadcrumbList and Organization

**Admin panel** `/admin` (Auth.js, credentials from env)
- Dashboard: sales, orders, AOV, products, customers, sales chart (Today / 7 days / 30 days / 12 months), recent orders, top products, low stock / out of stock
- Products: table with search and filters, bulk actions (publish, draft, archive, flags, delete), duplicate. **7-step form**: basic info → category → pricing → variants (color × size generator; SKU, stock and price per variant) → images (drag & drop, library, reorder, main image, per-color images) → SEO → publishing. Save draft / Save & publish
- **CSV / XLSX import**: preview, validation, counts of new / updated / duplicate / error rows, confirmation, **update by SKU with no duplicates**, image download by URL into Vercel Blob, downloadable error report, templates
- Categories (nested, reorder, SEO, show in nav), Collections (hero, product selection, SEO, reorder)
- Orders: statuses New → Confirmed → Processing → Packed → Shipped → Delivered / Cancelled / Returned, with automatic stock return on cancel or return. Payment status, tracking number (TTN), internal notes
- Customers, Reviews (moderation), Promotions (percentage, fixed amount, free shipping, limits, dates), Inventory (inline stock editing), Media library (upload, search, copy URL, delete, import by URL), Homepage CMS (add / delete / duplicate / move up / move down / active), Banners (placements and scheduling), Settings (name, accent color, shipping, SEO, texts, integration status)

---

## Tech stack

Next.js 16 (App Router, Server Components, Server Actions, `proxy.ts`) · TypeScript · Tailwind CSS v4 · shadcn/ui-style components on Radix UI · Lucide · PostgreSQL · Prisma 6 · Auth.js v5 · Vercel Blob · Zod · Recharts · dnd-kit · PapaParse + ExcelJS.

## Project structure

```
prisma/
  schema.prisma          # DB schema: User, AdminUser, Product, ProductVariant, ProductImage, Category,
                         # Collection, ProductCategory, ProductCollection, Order, OrderItem, Customer,
                         # Wishlist, Review, Banner, HomepageSection, Media, Promotion, Settings, …
  migrations/            # SQL migrations (prisma migrate deploy)
  seed.ts, demo-data.ts  # demo data: 40 products, 19 categories, 5 collections, orders, CMS
scripts/generate-demo-images.ts   # generator for the demo imagery in /public/demo
src/
  app/(store)/…          # storefront
  app/admin/…            # admin panel (login + (panel))
  app/api/admin/…        # upload, blob-upload, import, import template
  app/api/payments/[provider]/callback   # payment webhooks
  actions/               # Server Actions (cart, wishlist, checkout, catalog, admin/*)
  components/ui|store|admin
  lib/                   # db, queries (cached), importer, storage, rate-limit, pricing, providers/*
  auth.ts, proxy.ts      # Auth.js + protection for /admin and /api/admin
```

---

## Local setup

Requirements: Node.js ≥ 20.9 and PostgreSQL 14+ (local, Docker, or Neon).

```bash
# 1. Dependencies
npm install

# 2. Environment variables
cp .env.example .env
#   → fill in DATABASE_URL, AUTH_SECRET (npx auth secret), ADMIN_EMAIL, ADMIN_PASSWORD

# 3. Migrations
npx prisma migrate deploy        # or: npm run db:migrate (dev)

# 4. Demo data + admin
npm run db:seed

# 5. Start
npm run dev
```

- Store: http://localhost:3000
- Admin: http://localhost:3000/admin, using `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`

Postgres via Docker (optional):
```bash
docker run -d --name nordform-db -e POSTGRES_USER=store -e POSTGRES_PASSWORD=store -e POSTGRES_DB=fashion_store -p 5432:5432 postgres:16
# DATABASE_URL="postgresql://store:store@localhost:5432/fashion_store?schema=public"
```

Useful commands:

| Command | What it does |
|---|---|
| `npm run db:seed` | Creates or updates the admin and loads the demo catalog if the DB is empty |
| `npm run db:reset-demo` | **Deletes** the catalog, orders and content, then reloads the demo data |
| `npm run demo:images` | Regenerates the demo images in `public/demo` |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm run build` | Production build |

> Storefront data is cached (`unstable_cache`, 5 min) and invalidated automatically on every change made in the admin panel. The seed script writes to the DB directly, so after re-seeding a running server, restart it or wait up to 5 minutes.

---

## Deploying to Vercel (GitHub → Vercel → Production)

1. **Push the repository to GitHub.** The project lives in the `fashion-store/` folder, so in Vercel set **Root Directory = `fashion-store`**. If you move the project into its own repository, leave Root Directory empty.
2. **Vercel → Add New Project → Import** the repository. The framework is detected as Next.js. `vercel.json` already sets `buildCommand: npm run vercel-build`, which runs `prisma generate && prisma migrate deploy && next build`, so migrations apply automatically on every deploy.
3. **Database:** Storage → *Neon Postgres* (or any Postgres). Vercel adds `DATABASE_URL` for you. If the variable has a different name, add `DATABASE_URL` manually with the pooled connection string.
4. **Blob:** Storage → *Blob* → Connect to project. This adds `BLOB_READ_WRITE_TOKEN`.
5. **Environment Variables** (Production + Preview):
   - `AUTH_SECRET`: generate one with `npx auth secret`
   - `NEXT_PUBLIC_SITE_URL`: e.g. `https://your-domain.com`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   - optional: `NOVA_POSHTA_API_KEY`, `LIQPAY_PUBLIC_KEY`, `LIQPAY_PRIVATE_KEY`
6. **Deploy.**
7. **Seed the production database once**, from your machine:
   ```bash
   DATABASE_URL="<production connection string>" ADMIN_EMAIL="you@brand.com" ADMIN_PASSWORD="a-strong-password" npm run db:seed
   ```
   To create only the admin account without demo data, run the seed on an empty DB and then delete the demo products in the admin panel. Alternatively, import your own catalog via CSV right away.

The build does **not** need database access for page generation (all pages render on demand and cache their data), so the first deploy works even before seeding.

---

## CSV / XLSX import

Admin → Products → **Import CSV / XLSX** (templates are available on the same page).

| Column | Required | Notes |
|---|---|---|
| `SKU` | ✔ | Variant SKU (one row = one color/size variant) |
| `Parent SKU` |  | Groups variants into one product. If missing, rows are grouped by `Product Name` |
| `Product Name` | ✔ | |
| `Category`, `Subcategory` |  | Matched by name or slug and created if missing |
| `Collection` |  | Comma-separated, created if missing |
| `Color`, `Color Hex`, `Size` |  | |
| `Price` | ✔ | In the main currency unit (UAH). The lowest price in the group is the product price; others become per-variant prices |
| `Compare Price`, `Cost`, `Stock` |  | |
| `Description`, `Short Description`, `Tags`, `Material`, `Care`, `Brand`, `SEO Title`, `SEO Description` |  | |
| `Image URL` |  | One or more (comma-separated). Downloaded and saved to Vercel Blob; a repeat import reuses the file already stored |
| `Status` |  | Draft / Published / Archived |
| `Featured`, `New`, `Best Seller` |  | yes / no |

Rules:
- **The variant SKU already exists** → that variant and its product are **updated** (no duplicate is created).
- **The Parent SKU already exists** → the new variants are added to that product.
- **Otherwise** a new product is created.
- The same SKU appearing twice in one file is marked as a duplicate and skipped. Invalid rows show up in the preview and in the downloadable error report.
- Limits: 5,000 rows and 10 MB per file.

---

## Images and media

- Admin uploads go through `/api/admin/upload`, or directly from the browser to **Vercel Blob** (client upload, which avoids the 4.5 MB function body limit). Each file's type is checked by its magic bytes and its dimensions by `sharp`. Accepted formats: JPG / PNG / WEBP / AVIF / GIF (≤ 8 MB) and MP4 / WEBM (≤ 50 MB).
- Without `BLOB_READ_WRITE_TOKEN`, local development saves files to `public/uploads`. On Vercel, the token is required.
- Pages use `next/image` (AVIF/WebP, responsive `sizes`, lazy loading). The hero uses art direction, with separate desktop and mobile images.

## Payments and delivery (extensible)

- `src/lib/providers/payment/` defines the `PaymentProvider` interface (`createPayment`, `handleCallback`). Implemented so far: **Cash on delivery**, **Card (manual invoice)**, and **LiqPay**, which switches on when its keys are set, with a signed callback at `/api/payments/liqpay/callback`. To add WayForPay, Monobank or Stripe, create a file with the same interface and register it in `index.ts`.
- `src/lib/providers/delivery/` defines the `DeliveryProvider` interface. **Nova Poshta** (`NOVA_POSHTA_API_KEY`) provides city and branch autocomplete in checkout. Without a key, the fields are plain text inputs.

## Security

- `proxy.ts` (Auth.js) blocks `/admin/*` and `/api/admin/*` without a session. On top of that, **every** Server Action and admin route handler calls `requireAdmin()`, which re-checks the user in the DB.
- The admin password is stored as a bcrypt hash and comes only from env, never from the frontend. JWT sessions last 12 hours.
- CSRF: Server Actions check Origin natively, admin route handlers check same-origin, and Auth.js has its own CSRF token.
- Zod validation on every mutation, DB-backed rate limiting (works across serverless instances) for login, checkout, search, reviews, promo codes and uploads, and a honeypot on public forms.
- File validation (magic bytes, size, sharp decoding) and SSRF protection when importing images by URL.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
- Money is stored in minor units (kopecks) as `Int`. Order prices are computed on the server only, and stock is reserved atomically in a transaction.

## Performance

Server Components by default, cached catalog queries with tag-based invalidation, pagination (24 products per page), DB indexes on every filter and sort field, `next/image` with AVIF/WebP, and small client bundles (the cart, wishlist and quick add are the only interactive islands).
