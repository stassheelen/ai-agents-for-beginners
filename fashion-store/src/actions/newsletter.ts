"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { limitByIp } from "@/lib/rate-limit";

export async function subscribe(_: unknown, formData: FormData): Promise<{ ok: boolean; message: string }> {
  if (!(await limitByIp("newsletter", 5, 3600))) return { ok: false, message: "Забагато спроб. Спробуйте пізніше." };
  const parsed = z.string().trim().toLowerCase().email().max(120).safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, message: "Вкажіть коректний email" };
  if (formData.get("company")) return { ok: true, message: "Дякуємо за підписку!" }; // honeypot
  await prisma.subscriber.upsert({ where: { email: parsed.data }, update: {}, create: { email: parsed.data } });
  return { ok: true, message: "Дякуємо за підписку!" };
}
