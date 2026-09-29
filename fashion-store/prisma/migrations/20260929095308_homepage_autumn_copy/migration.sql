-- Homepage copy update: autumn-focused hero, remove the "About" text block.
-- Only touches the original demo rows (matched by their exact text), so edits made in the admin are kept.
UPDATE "HomepageSection"
SET "label" = 'Нова колекція',
    "title" = 'Осінь 2026',
    "subtitle" = 'Худі з начосом, флісові куртки та широкі штани в коричневих, бежевих і оливкових відтінках.',
    "buttonLabel" = 'Дивитись колекцію',
    "buttonLink" = '/collections/new-season',
    "button2Label" = 'Усі новинки',
    "button2Link" = '/shop?flag=new'
WHERE "type" = 'HERO' AND "title" = 'Рух, що відчувається як спокій';

DELETE FROM "HomepageSection"
WHERE "type" = 'TEXT' AND "title" = 'Менше речей. Кращі речі.';
