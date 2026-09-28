/** Налаштування з Vercel Environment Variables. Жодних секретів у коді чи в Android-додатку. */
export interface GoogleSheetsConfig {
  /** URL вебдодатка Apps Script (…/exec), прив'язаного до Google Таблиці. */
  scriptUrl: string;
  /** Спільний секрет: той самий, що SHARED_SECRET у властивостях скрипту. */
  secret: string;
}

const env = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

export function deviceApiKeys(): string[] {
  return (env("DEVICE_API_KEYS") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

/** null — якщо Google Таблицю ще не налаштовано. */
export function googleSheetsConfig(): GoogleSheetsConfig | null {
  const scriptUrl = env("GOOGLE_SCRIPT_URL");
  const secret = env("GOOGLE_SCRIPT_SECRET");
  if (!scriptUrl || !secret) return null;
  return { scriptUrl, secret };
}

export const MAX_EVENTS_PER_REQUEST = 500;
