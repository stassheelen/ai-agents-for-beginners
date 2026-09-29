import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

export const STORE_TAG = "store";

/** Invalidate all cached storefront data immediately (used after admin mutations). */
export function invalidateStore() {
  revalidateTag(STORE_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}
