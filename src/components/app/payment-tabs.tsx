"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaymentMethod } from "@/lib/account";

export function PaymentTabs({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}) {
  const t = useTranslations("checkout");

  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (next === "card" || next === "alipay") {
          onChange(next);
        }
      }}
    >
      <TabsList className="rounded-[10px] bg-surface-2">
        <TabsTrigger value="card" className="rounded-md px-4">
          {t("card")}
        </TabsTrigger>
        <TabsTrigger value="alipay" className="rounded-md px-4">
          {t("alipay")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
