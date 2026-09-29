import { assertSameOrigin, requireAdmin, UnauthorizedError } from "@/lib/admin";
import { storeFile, UploadError } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

/** Server-side multipart upload (used locally and for files under the 4.5 MB serverless limit). */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    await assertSameOrigin(req);
    if (!(await rateLimit(`upload:${admin.id}`, 120, 600))) return Response.json({ error: "Too many uploads" }, { status: 429 });
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) return Response.json({ error: "No files" }, { status: 400 });
    if (files.length > 20) return Response.json({ error: "Max 20 files per upload" }, { status: 400 });
    const results = [];
    const errors: string[] = [];
    for (const file of files) {
      try {
        const media = await storeFile({ buffer: Buffer.from(await file.arrayBuffer()), filename: file.name, declaredType: file.type });
        results.push(media);
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      }
    }
    return Response.json({ media: results, errors });
  } catch (e) {
    if (e instanceof UnauthorizedError) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof UploadError) return Response.json({ error: e.message }, { status: 400 });
    console.error(e);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
