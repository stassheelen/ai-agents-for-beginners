import { createHash, timingSafeEqual } from "node:crypto";
import { deviceApiKeys } from "./config";

export type AuthResult = { ok: true } | { ok: false; status: 401 | 503; error: string };

const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

/** Перевіряє ключ пристрою (заголовок x-api-key) у постійному часі. */
export function checkDeviceKey(request: Request, keys: string[] = deviceApiKeys()): AuthResult {
  if (keys.length === 0) {
    return { ok: false, status: 503, error: "DEVICE_API_KEYS не налаштовано на сервері" };
  }
  const provided = request.headers.get("x-api-key")?.trim();
  if (!provided) return { ok: false, status: 401, error: "Відсутній ключ пристрою (x-api-key)" };
  const providedDigest = digest(provided);
  const match = keys.some((key) => timingSafeEqual(digest(key), providedDigest));
  return match ? { ok: true } : { ok: false, status: 401, error: "Невірний ключ пристрою" };
}
