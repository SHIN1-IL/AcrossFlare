"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { PlanCard } from "@/components/marketing/plan-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLivePlans } from "@/hooks/use-admin";
import type { ProductId } from "@/lib/plans";

export function PricingView({
  initialProduct,
  showAlipay,
}: {
  initialProduct: ProductId;
  showAlipay: boolean;
}) {
  const t = useTranslations("pricing");
  const [product, setProduct] = useState<ProductId>(initialProduct);
  const plans = useLivePlans(product);

  return (
    <div className="space-y-8">
      <Tabs
        value={product}
        onValueChange={(value) => {
          if (value === "global" || value === "marketing") {
            setProduct(value);
          }
        }}
        className="items-center"
      >
        <TabsList className="rounded-[10px] bg-surface-2">
          <TabsTrigger value="global" className="rounded-md px-4">
            {t("global")}
          </TabsTrigger>
          <TabsTrigger value="marketing" className="rounded-md px-4">
            {t("marketing")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} showAlipay={showAlipay} />
        ))}
      </div>
    </div>
  );
}
