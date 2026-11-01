"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { fieldClass } from "@/components/admin/admin-drawer";
import { Button } from "@/components/ui/button";

type Order = {
  id: string;
  name: string;
  priceKrw: number;
  currency: string;
  chargedAmount: number;
  status: string;
  qrText: string;
};

export function EsimCustomerOrders({ customerId }: { customerId: string }) {
  const t = useTranslations("admin");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [qr, setQr] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void fetch(`/api/v1/admin/customers/${customerId}/esim`, { credentials: "include" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data: { orders: Order[] } | null) => {
        if (!data) {
          setOrders([]);
          return;
        }
        setOrders(data.orders);
        setQr(Object.fromEntries(data.orders.map((order) => [order.id, order.qrText])));
      });
  }, [customerId]);

  if (!orders || orders.length === 0) {
    return null;
  }

  async function save(orderId: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/v1/admin/esim/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrText: qr[orderId] ?? "" }),
      });
      if (!response.ok) {
        return;
      }
      setOrders((current) =>
        current?.map((order) =>
          order.id === orderId ? { ...order, status: "READY", qrText: qr[orderId] ?? "" } : order
        ) ?? null
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium">{t("esimCustomerOrders")}</h2>
      {orders.map((order) => (
        <article key={order.id} className="space-y-2">
          <p className="text-sm">
            {order.name} · {order.chargedAmount || order.priceKrw} {order.currency || "KRW"} · {order.status}
          </p>
          {order.status === "CANCELLED" ? null : (
            <>
              <textarea
                className={fieldClass}
                rows={3}
                value={qr[order.id] ?? ""}
                onChange={(event) => setQr((current) => ({ ...current, [order.id]: event.target.value }))}
              />
              <Button type="button" className="rounded-[10px]" disabled={pending} onClick={() => void save(order.id)}>
                {t("esimQrSave")}
              </Button>
            </>
          )}
        </article>
      ))}
    </section>
  );
}
