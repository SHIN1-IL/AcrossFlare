"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AdminDrawer, fieldClass } from "@/components/admin/admin-drawer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/hooks/use-admin";
import { addNode, clearMigrate, countNodeUsers, deleteNode, listNodes, runMigrate } from "@/lib/admin-store";
import type { AdminNode, NodeRole } from "@/lib/admin";
import type { ProductId } from "@/lib/plans";

export function NodeManager({ product }: { product: ProductId }) {
  const t = useTranslations("admin");
  const { migrate, migrating } = useAdmin();
  const nodes = listNodes(product);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<AdminNode | null>(null);
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    ddns: "",
    role: "bandwagon" as NodeRole,
    host: "",
    port: "",
    username: "",
    password: "",
  });

  const job = migrate?.product === product ? migrate : null;
  const sourceCount = source ? countNodeUsers(source.id) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        title={t("nodesTitle")}
        subtitle={t("nodesSubtitle")}
        action={
          <Button type="button" className="rounded-[10px]" onClick={() => setOpen(true)}>
            {t("addNode")}
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t("nodeName")}</th>
              <th className="px-4 py-3 font-medium">{t("ddns")}</th>
              <th className="px-4 py-3 font-medium">{t("role")}</th>
              <th className="px-4 py-3 font-medium">{t("nodeStatus")}</th>
              <th className="px-4 py-3 font-medium">{t("users")}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => {
              const users = countNodeUsers(node.id);
              return (
                <tr key={node.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{node.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{node.ddns}</td>
                  <td className="px-4 py-3 text-xs">
                    {node.role === "bandwagon" ? t("roleBandwagon") : t("roleRacknerd")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={t(node.status)}
                      tone={node.status === "online" ? "ok" : node.status === "degraded" ? "warn" : "neutral"}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{users}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSource(node);
                        setTargetId(nodes.find((item) => item.id !== node.id)?.id ?? "");
                        setError("");
                      }}
                    >
                      {t("migrate")}
                    </Button>
                    {users === 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void deleteNode(node.id);
                        }}
                      >
                        {t("delete")}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {source ? (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm">{t("migrateTitle")}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {t("migrateFrom")}: {source.ddns}
          </p>
          <div className="space-y-2">
            <Label>{t("migrateTo")}</Label>
            <select className={fieldClass} value={targetId} onChange={(event) => setTargetId(event.target.value)}>
              {nodes
                .filter((node) => node.id !== source.id)
                .map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name} · {node.ddns}
                  </option>
                ))}
            </select>
          </div>
          <p className="text-sm text-muted-foreground">{t("migrateConfirm", { count: sourceCount })}</p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {job ? (
            <div className="space-y-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${job.total ? Math.round((job.done / job.total) * 100) : 0}%` }}
                />
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {job.running ? t("migrateProgress", { done: job.done, total: job.total }) : t("migrateDone")}
              </p>
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              className="rounded-[10px]"
              disabled={migrating}
              onClick={() => {
                if (!targetId) {
                  setError(t("selectTarget"));
                  return;
                }
                if (targetId === source.id) {
                  setError(t("sameNode"));
                  return;
                }
                if (sourceCount === 0) {
                  setError(t("noUsers"));
                  return;
                }
                void runMigrate({ product, fromNodeId: source.id, toNodeId: targetId });
              }}
            >
              {t("migrateRun")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-[10px]"
              onClick={() => {
                setSource(null);
                clearMigrate();
                setError("");
              }}
            >
              {t("close")}
            </Button>
          </div>
        </section>
      ) : null}

      <AdminDrawer open={open} title={t("addNode")} onClose={() => setOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.name.trim() || !draft.ddns.trim() || !draft.host.trim() || !draft.username.trim() || !draft.password) {
              return;
            }
            void (async () => {
              const node = await addNode({ product, ...draft });
              if (!node) {
                return;
              }
              setDraft({
                name: "",
                ddns: "",
                role: "bandwagon",
                host: "",
                port: "",
                username: "",
                password: "",
              });
              setOpen(false);
            })();
          }}
        >
          <Field label={t("nodeName")}>
            <input className={fieldClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <Field label={t("ddns")}>
            <input
              className={fieldClass}
              placeholder="node-xx.acrossflare.com"
              value={draft.ddns}
              onChange={(event) => setDraft({ ...draft, ddns: event.target.value })}
            />
          </Field>
          <Field label={t("role")}>
            <select
              className={fieldClass}
              value={draft.role}
              onChange={(event) => setDraft({ ...draft, role: event.target.value as NodeRole })}
            >
              <option value="bandwagon">{t("roleBandwagon")}</option>
              <option value="racknerd">{t("roleRacknerd")}</option>
            </select>
          </Field>
          <p className="text-xs text-muted-foreground">{t("maskedHint")}</p>
          <Field label={t("host")}>
            <input className={fieldClass} value={draft.host} onChange={(event) => setDraft({ ...draft, host: event.target.value })} />
          </Field>
          <Field label={t("port")}>
            <input className={fieldClass} value={draft.port} onChange={(event) => setDraft({ ...draft, port: event.target.value })} />
          </Field>
          <Field label={t("username")}>
            <input className={fieldClass} value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} />
          </Field>
          <Field label={t("password")}>
            <input
              type="password"
              className={fieldClass}
              value={draft.password}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
            />
          </Field>
          <Button type="submit" className="rounded-[10px]">
            {t("save")}
          </Button>
        </form>
      </AdminDrawer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
