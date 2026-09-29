import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-5 py-24 text-center">
      <p className="eyebrow text-muted-foreground">404</p>
      <h1 className="font-display text-4xl font-medium lg:text-6xl">Сторінку не знайдено</h1>
      <p className="max-w-md text-sm text-muted-foreground">Можливо, товар більше не доступний або посилання застаріло.</p>
      <div className="mt-2 flex gap-3">
        <Button asChild>
          <Link href="/shop">До каталогу</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">На головну</Link>
        </Button>
      </div>
    </div>
  );
}
