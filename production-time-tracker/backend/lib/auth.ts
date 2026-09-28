import { createHash, timingSafeEqual } from "node:crypto";
import { deviceApiKeys } from "./config";

export type AuthResult = { ok: true } | { ok: false; status: 401 | 503; error: string };

const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

/** Пробіли й дефіси в ключі ігноруються: «1234-5678» = «1234 5678» = «12345678». */
export const normalizeKey = (value: string) => value.replace(/[\s-]/g, "");

/** Перевіряє ключ пристрою (заголовок x-api-key) у постійному часі. */
export function checkDeviceKey(request: Request, keys: string[] = deviceApiKeys()): AuthResult {
  if (keys.length === 0) {
    return { ok: false, status: 503, error: "DEVICE_API_KEYS не налаштовано на сервері" };
  }
  const provided = normalizeKey(request.headers.get("x-api-key") ?? "");
  if (!provided) return { ok: false, status: 401, error: "Відсутній ключ пристрою (x-api-key)" };
  const providedDigest = digest(provided);
  const match = keys.some((key) => timingSafeEqual(digest(normalizeKey(key)), providedDigest));
  return match ? { ok: true } : { ok: false, status: 401, error: "Невірний ключ пристрою" };
}
