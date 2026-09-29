"use client";

import { Button } from "@/components/ui/button";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="font-display text-3xl">Щось пішло не так</h1>
      <p className="max-w-md text-sm text-muted-foreground">Ми вже знаємо про проблему. Спробуйте оновити сторінку.</p>
      <Button onClick={reset}>Спробувати ще раз</Button>
    </div>
  );
}
