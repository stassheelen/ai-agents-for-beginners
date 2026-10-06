import { assertSameOrigin, requireAdmin, UnauthorizedError } from "@/lib/admin";
import { commitImport, parseFeedText, parseFile, planImport } from "@/lib/importer";
import { fetchFeed } from "@/lib/yml-feed";
import { invalidateStore } from "@/lib/cache";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 300;

const MAX_FILE = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    await assertSameOrigin(req);
    const form = await req.formData();
    const file = form.get("file");
    const mode = form.get("mode") === "commit" ? "commit" : "preview";
    const chunkRaw = form.get("chunk");
    const chunk = typeof chunkRaw === "string" && /^\d{1,5}$/.test(chunkRaw) ? Number(chunkRaw) : undefined;
    // A chunked commit is one import: only its first request counts towards the limit.
    if (!chunk && !(await rateLimit(`import:${admin.id}`, 30, 600))) return Response.json({ error: "Забагато імпортів, зачекайте кілька хвилин" }, { status: 429 });
    const feedUrl = form.get("url");
    let parsed;
    if (typeof feedUrl === "string" && feedUrl.trim()) {
      // XML / YML feed by link (e.g. a supplier's Prom feed): fetched server-side.
      parsed = parseFeedText(await fetchFeed(feedUrl));
      // Feeds without a shop name: the feed's site is the supplier.
      const host = new URL(feedUrl.trim()).hostname.replace(/^www\./, "");
      for (const r of parsed.rows) r.data.supplier ??= host;
    } else {
      if (!(file instanceof File)) return Response.json({ error: "Файл не завантажено" }, { status: 400 });
      if (file.size > MAX_FILE) return Response.json({ error: "Файл більше 10 МБ" }, { status: 400 });
      parsed = await parseFile(file);
    }
    const { rows, unknownColumns } = parsed;
    if (mode === "preview") {
      const preview = await planImport(rows, unknownColumns);
      return Response.json({ preview: { ...preview, rows: preview.rows.slice(0, 1000) } });
    }
    const result = await commitImport(rows, { chunk });
    invalidateStore();
    return Response.json({ result });
  } catch (e) {
    if (e instanceof UnauthorizedError) return Response.json({ error: "Немає доступу" }, { status: 401 });
    return Response.json({ error: e instanceof Error ? e.message : "Помилка імпорту" }, { status: 400 });
  }
}
