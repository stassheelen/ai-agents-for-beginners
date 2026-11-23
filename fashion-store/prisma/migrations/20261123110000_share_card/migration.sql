-- The demo seed's placeholder share image is replaced by the branded link card (public/og.jpg).
UPDATE "Settings"
SET "ogImage" = '/og.jpg'
WHERE "ogImage" IS NULL OR "ogImage" = '/demo/og-default.webp';
