"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { subscribe } from "@/actions/newsletter";

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribe, null);
  return (
    <form action={action} className="mt-8 max-w-sm">
      <label htmlFor="nl-email" className="eyebrow mb-3 block">
        Новини та закриті розпродажі
      </label>
      <div className="flex border-b border-foreground">
        <input id="nl-email" name="email" type="email" required placeholder="Ваш email" className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        <input name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <button type="submit" disabled={pending} aria-label="Підписатися" className="px-2 disabled:opacity-50">
          <ArrowRight className="size-4" />
        </button>
      </div>
      {state && <p className={`mt-2 text-xs ${state.ok ? "text-success" : "text-destructive"}`}>{state.message}</p>}
    </form>
  );
}
