"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { fieldClass } from "@/components/admin/admin-drawer";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-account";
import { isOwnerSession } from "@/lib/auth-types";

type Product = {
  id: string;
  name: string;
  dataGb: number;
  days: number;
  priceKrw: number;
  priceUsd: number;
  priceCny: number;
  priceJpy: number;
};

type Order = {
  id: string;
  email: string;
  name: string;
  priceKrw: number;
  currency: string;
  chargedAmount: number;
  status: string;
  qrText: string;
  createdAt: string;
};

type Copy = {
  copyNoWifi: string;
  copyRefund: string;
  copyKorea: string;
  copyExit: string;
  copyYear: string;
};

const EMPTY_COPY: Copy = {
  copyNoWifi: "",
  copyRefund: "",
  copyKorea: "",
  copyExit: "",
  copyYear: "",
};

export function EsimAdmin() {
  const t = useTranslations("admin");
  const session = useSession();
  const owner = isOwnerSession(session);
  const [enabled, setEnabled] = useState(false);
  const [copy, setCopy] = useState<Copy>(EMPTY_COPY);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [qr, setQr] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (owner) {
      void fetch("/api/v1/admin/esim", { credentials: "include" })
        .then(async (response) => (response.ok ? response.json() : null))
        .then((data: { enabled: boolean; copy: Copy; products: Product[] } | null) => {
          if (!data) {
            return;
          }
          setEnabled(data.enabled);
          setCopy(data.copy);
          setProducts(data.products);
        });
    }

    void fetch("/api/v1/admin/esim/orders", { credentials: "include" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data: { orders: Order[] } | null) => {
        if (!data) {
          return;
        }
        setOrders(data.orders);
        setQr(Object.fromEntries(data.orders.map((order) => [order.id, order.qrText])));
      });
  }, [owner]);

  async function saveSettings() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/admin/esim", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, ...copy }),
      });
      setMessage(response.ok ? t("esimSaved") : t("esimSaveFailed"));
    } finally {
      setPending(false);
    }
  }

  async function saveProduct(product: Product) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/esim/products/${product.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      setMessage(response.ok ? t("esimSaved") : t("esimSaveFailed"));
    } finally {
      setPending(false);
    }
  }

  async function saveQr(orderId: string) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/esim/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrText: qr[orderId] ?? "" }),
      });
      if (!response.ok) {
        setMessage(t("esimSaveFailed"));
        return;
      }
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? { ...order, status: "READY", qrText: qr[orderId] ?? "" } : order))
      );
      setMessage(t("esimSaved"));
    } finally {
      setPending(false);
    }
  }

  async function cancelOrder(orderId: string) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/esim/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel: true }),
      });
      if (!response.ok) {
        setMessage(t("esimSaveFailed"));
        return;
      }
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? { ...order, status: "CANCELLED" } : order))
      );
      setMessage(t("esimSaved"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader title={t("esimTitle")} subtitle={t("esimSubtitle")} />
      {owner ? (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium">{t("esimEnabled")}</h2>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={enabled ? "default" : "outline"}
                className="rounded-[10px]"
                onClick={() => setEnabled(true)}
              >
                {t("esimOn")}
              </Button>
              <Button
                type="button"
                variant={!enabled ? "default" : "outline"}
                className="rounded-[10px]"
                onClick={() => setEnabled(false)}
              >
                {t("esimOff")}
              </Button>
            </div>
          </div>
          {(
            [
              ["copyNoWifi", "esimCopyNoWifi"],
              ["copyRefund", "esimCopyRefund"],
              ["copyKorea", "esimCopyKorea"],
              ["copyExit", "esimCopyExit"],
              ["copyYear", "esimCopyYear"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block space-y-1">
              <span className="text-xs text-muted-foreground">{t(label)}</span>
              <textarea
                className={fieldClass}
                rows={2}
                value={copy[key]}
                onChange={(event) => setCopy((current) => ({ ...current, [key]: event.target.value }))}
              />
            </label>
          ))}
          <Button type="button" className="rounded-[10px]" disabled={pending} onClick={() => void saveSettings()}>
            {t("esimSave")}
          </Button>
        </section>
      ) : null}

      {owner
        ? products.map((product) => (
            <section key={product.id} className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-medium">{product.name}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={t("esimName")}
                  value={product.name}
                  onChange={(name) =>
                    setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, name } : item)))
                  }
                />
                <Field
                  label={t("esimDataGb")}
                  value={String(product.dataGb)}
                  onChange={(value) =>
                    setProducts((current) =>
                      current.map((item) => (item.id === product.id ? { ...item, dataGb: Number(value) } : item))
                    )
                  }
                />
                <Field
                  label={t("esimDays")}
                  value={String(product.days)}
                  onChange={(value) =>
                    setProducts((current) =>
                      current.map((item) => (item.id === product.id ? { ...item, days: Number(value) } : item))
                    )
                  }
                />
                <Field
                  label={t("esimPrice")}
                  value={String(product.priceKrw)}
                  onChange={(value) =>
                    setProducts((current) =>
                      current.map((item) =>
                        item.id === product.id ? { ...item, priceKrw: Number(value) } : item
                      )
                    )
                  }
                />
                <Field
                  label={t("esimPriceUsd")}
                  value={String(product.priceUsd)}
                  onChange={(value) =>
                    setProducts((current) =>
                      current.map((item) =>
                        item.id === product.id ? { ...item, priceUsd: Number(value) } : item
                      )
                    )
                  }
                />
                <Field
                  label={t("esimPriceCny")}
                  value={String(product.priceCny)}
                  onChange={(value) =>
                    setProducts((current) =>
                      current.map((item) =>
                        item.id === product.id ? { ...item, priceCny: Number(value) } : item
                      )
                    )
                  }
                />
                <Field
                  label={t("esimPriceJpy")}
                  value={String(product.priceJpy)}
                  onChange={(value) =>
                    setProducts((current) =>
                      current.map((item) =>
                        item.id === product.id ? { ...item, priceJpy: Number(value) } : item
                      )
                    )
                  }
                />
              </div>
              <Button type="button" className="rounded-[10px]" disabled={pending} onClick={() => void saveProduct(product)}>
                {t("esimSave")}
              </Button>
            </section>
          ))
        : null}

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium">{t("esimOrders")}</h2>
        {orders.length === 0 ? <p className="text-sm text-muted-foreground">{t("esimEmpty")}</p> : null}
        {orders.map((order) => (
          <article key={order.id} className="space-y-2 border-t border-border pt-4">
            <p className="text-sm">
              {order.email} · {order.name} · {order.chargedAmount || order.priceKrw} {order.currency || "KRW"} · {order.status}
            </p>
            {order.status !== "CANCELLED" ? (
              <>
                <textarea
                  className={fieldClass}
                  rows={3}
                  value={qr[order.id] ?? ""}
                  onChange={(event) => setQr((current) => ({ ...current, [order.id]: event.target.value }))}
                  placeholder={t("esimQr")}
                />
                <div className="flex gap-2">
                  <Button type="button" className="rounded-[10px]" disabled={pending} onClick={() => void saveQr(order.id)}>
                    {t("esimQrSave")}
                  </Button>
                  {order.status === "AWAITING_QR" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-[10px]"
                      disabled={pending}
                      onClick={() => void cancelOrder(order.id)}
                    >
                      {t("esimCancel")}
                    </Button>
                  ) : null}
                </div>
              </>
            ) : null}
          </article>
        ))}
      </section>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
