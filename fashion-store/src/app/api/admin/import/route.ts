import { assertSameOrigin, requireAdmin, UnauthorizedError } from "@/lib/admin";
import { commitImport, parseFile, planImport } from "@/lib/importer";
import { invalidateStore } from "@/lib/cache";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 300;

const MAX_FILE = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    await assertSameOrigin(req);
    if (!(await rateLimit(`import:${admin.id}`, 30, 600))) return Response.json({ error: "Забагато імпортів, зачекайте кілька хвилин" }, { status: 429 });
    const form = await req.formData();
    const file = form.get("file");
    const mode = form.get("mode") === "commit" ? "commit" : "preview";
    if (!(file instanceof File)) return Response.json({ error: "Файл не завантажено" }, { status: 400 });
    if (file.size > MAX_FILE) return Response.json({ error: "Файл більше 10 МБ" }, { status: 400 });
    const { rows, unknownColumns } = await parseFile(file);
    if (mode === "preview") {
      const preview = await planImport(rows, unknownColumns);
      return Response.json({ preview: { ...preview, rows: preview.rows.slice(0, 1000) } });
    }
    const result = await commitImport(rows);
    invalidateStore();
    return Response.json({ result });
  } catch (e) {
    if (e instanceof UnauthorizedError) return Response.json({ error: "Немає доступу" }, { status: 401 });
    return Response.json({ error: e instanceof Error ? e.message : "Помилка імпорту" }, { status: 400 });
  }
}
