import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin, UnauthorizedError } from "@/lib/admin";
import { MAX_VIDEO_BYTES } from "@/lib/storage";

/** Issues short-lived client tokens for direct browser → Vercel Blob uploads (admins only). */
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        await requireAdmin();
        if (!pathname.startsWith("media/")) throw new Error("Некоректний шлях");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "video/mp4", "video/webm"],
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(json);
  } catch (e) {
    const status = e instanceof UnauthorizedError ? 401 : 400;
    return Response.json({ error: e instanceof Error ? e.message : "Помилка завантаження" }, { status });
  }
}
