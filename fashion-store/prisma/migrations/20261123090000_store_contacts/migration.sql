-- Replace the placeholder contacts from the demo seed with the store's real ones.
-- Values changed in the admin panel since then are left as they are.
UPDATE "Settings"
SET "contactEmail" = 'vela.wearua@gmail.com'
WHERE "contactEmail" IS NULL OR "contactEmail" = 'hello@vella.store';

UPDATE "Settings"
SET "contactPhone" = '+380 96 494 54 95'
WHERE "contactPhone" IS NULL OR "contactPhone" = '+380 44 000 00 00';

-- The footer linked to instagram.com itself; hide the link until a real profile is set.
UPDATE "Settings"
SET "instagramUrl" = NULL
WHERE "instagramUrl" IN ('https://instagram.com/', 'https://instagram.com', 'https://www.instagram.com/');
