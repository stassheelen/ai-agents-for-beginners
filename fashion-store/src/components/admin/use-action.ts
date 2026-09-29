"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type R = { ok: boolean; error?: string; message?: string };

/** Runs a server action, shows a toast and refreshes server data. */
export function useAdminAction() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const run = React.useCallback(
    async <T extends R>(fn: () => Promise<T>, opts?: { success?: string; silent?: boolean }): Promise<T | null> => {
      setPending(true);
      try {
        const res = await fn();
        if (!res.ok) toast.error(res.error ?? "Помилка");
        else {
          if (!opts?.silent) toast.success(opts?.success ?? res.message ?? "Збережено");
          router.refresh();
        }
        return res;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Помилка");
        return null;
      } finally {
        setPending(false);
      }
    },
    [router],
  );
  return { run, pending };
}
