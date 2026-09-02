import { revalidateTag } from "next/cache";
import { STOREFRONT_PLANS_TAG } from "@/lib/storefront-plans";

/** Bust cached plan prices after admin edits. */
export function revalidateStorefrontPlans() {
  revalidateTag(STOREFRONT_PLANS_TAG, "max");
}
