import { revalidateTag } from "next/cache";
import { purgeCloudflareMarketingCache } from "@/lib/cloudflare-purge";
import { STOREFRONT_PLANS_TAG } from "@/lib/storefront-plans";

/** Bust Next data cache + Cloudflare edge HTML after admin plan edits. */
export function revalidateStorefrontPlans() {
  revalidateTag(STOREFRONT_PLANS_TAG, "max");
  void purgeCloudflareMarketingCache().then((result) => {
    if (!result.ok) {
      console.warn("[storefront] Cloudflare purge failed:", result.error);
      return;
    }
    if (result.skipped) {
      return;
    }
    console.info(`[storefront] Cloudflare purged ${result.purged} marketing URLs`);
  });
}
