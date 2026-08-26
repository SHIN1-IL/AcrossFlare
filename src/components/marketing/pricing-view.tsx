"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { PlanCard } from "@/components/marketing/plan-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLivePlans } from "@/hooks/use-admin";
import {
  MARKETING_SERVICES,
  getMarketingService,
  type MarketingServiceId,
} from "@/lib/marketing-services";
import { getPlanById, publicPlanFrom, type Plan } from "@/lib/plans";

export function PricingView({
  initialService,
  showAlipay,
}: {
  initialService: MarketingServiceId;
  showAlipay: boolean;
}) {
  const t = useTranslations("pricing");
  const [service, setService] = useState<MarketingServiceId>(initialService);
  const current = getMarketingService(service);
  const livePlans = useLivePlans(current.product);
  const plans = current.planIds
    .map((id) => publicPlanFrom(getPlanById(id), livePlans.find((plan) => plan.id === id)))
    .filter((plan): plan is Plan => Boolean(plan));

  return (
    <div className="space-y-8">
      <Tabs
        value={service}
        onValueChange={(value) => {
          if (value === "standard" || value === "hybrid" || value === "workspace") {
            setService(value);
          }
        }}
        className="items-center"
      >
        <TabsList className="rounded-[10px] bg-surface-2">
          {MARKETING_SERVICES.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="rounded-md px-4">
              {t(item.id)}
            </TabsTrigger>
          ))}
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
