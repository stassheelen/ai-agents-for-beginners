-- The admin login moved to vela.wearua@gmail.com (ADMIN_EMAIL). Switch off the old demo-domain account,
-- but only once the new account exists and is active, so nobody is locked out.
UPDATE "AdminUser" SET "active" = false
WHERE "email" = 'admin@vella.store'
  AND EXISTS (SELECT 1 FROM "AdminUser" WHERE "email" = 'vela.wearua@gmail.com' AND "active" = true);
