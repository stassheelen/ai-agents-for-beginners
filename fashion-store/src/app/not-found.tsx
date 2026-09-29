import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">404</p>
      <h1 className="font-display text-4xl">Сторінку не знайдено</h1>
      <Link href="/" className="text-sm underline underline-offset-4">На головну</Link>
    </div>
  );
}
