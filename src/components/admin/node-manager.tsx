"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AdminDrawer, fieldClass } from "@/components/admin/admin-drawer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/hooks/use-admin";
import {
  addNode,
  clearMigrate,
  countNodeUsers,
  deleteNode,
  listNodes,
  probeNode,
  runMigrate,
  updateNode,
} from "@/lib/admin-store";
import type { AdminNode, NodeRole, XuiProbeInbound } from "@/lib/admin";
import type { ProductId } from "@/lib/plans";

const emptyDraft = {
  name: "",
  ddns: "",
  role: "bandwagon" as NodeRole,
  host: "",
  port: "2053",
  username: "",
  password: "",
  inboundId: "",
};

export function NodeManager({ product }: { product: ProductId }) {
  const t = useTranslations("admin");
  const { migrate, migrating, provisionSimulate } = useAdmin();
  const nodes = listNodes(product);
  const [editing, setEditing] = useState<AdminNode | "new" | null>(null);
  const [source, setSource] = useState<AdminNode | null>(null);
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [formError, setFormError] = useState("");
  const [probing, setProbing] = useState(false);
  const [probeNote, setProbeNote] = useState("");
  const [probeOk, setProbeOk] = useState(false);
  const [inbounds, setInbounds] = useState<XuiProbeInbound[]>([]);
  const [rowProbe, setRowProbe] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  const job = migrate?.product === product ? migrate : null;
  const sourceCount = source ? countNodeUsers(source.id) : 0;
  const placeholders = nodes.filter((node) => node.wiring === "placeholder").length;

  function openCreate() {
    setEditing("new");
    setDraft(emptyDraft);
    setFormError("");
    setProbeNote("");
    setProbeOk(false);
    setInbounds([]);
  }

  function openEdit(node: AdminNode) {
    setEditing(node);
    setDraft({
      name: node.name,
      ddns: node.ddns,
      role: node.role,
      host: "",
      port: String(node.port || 2053),
      username: "",
      password: "",
      inboundId: node.inboundId ? String(node.inboundId) : "",
    });
    setFormError("");
    setProbeNote("");
    setProbeOk(false);
    setInbounds([]);
  }

  async function runProbe(node?: AdminNode) {
    const target = node ?? (editing && editing !== "new" ? editing : undefined);
    setProbing(true);
    setFormError("");
    if (node) {
      setRowProbe(null);
    } else {
      setProbeNote("");
    }

    const result = await probeNode({
      id: target?.id,
      host: node ? undefined : draft.host || undefined,
      port: node ? undefined : draft.port || undefined,
      username: node ? undefined : draft.username || undefined,
      password: node ? undefined : draft.password || undefined,
    });

    setProbing(false);
    if (result.ok) {
      const text = t("probeOk", { count: result.inbounds.length });
      if (node) {
        setRowProbe({ id: node.id, ok: true, text });
        return;
      }
      setInbounds(result.inbounds);
      setDraft((current) => {
        if (current.inboundId) {
          return current;
        }
        const vless = result.inbounds.find((item) => item.protocol.toLowerCase().includes("vless") && item.enable);
        const picked = vless ?? result.inbounds[0];
        return picked ? { ...current, inboundId: String(picked.id) } : current;
      });
      setProbeOk(true);
      setProbeNote(text);
      return;
    }

    const text = t("probeFail", { error: result.error });
    if (node) {
      setRowProbe({ id: node.id, ok: false, text });
      return;
    }
    setProbeOk(false);
    setProbeNote(text);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        title={t("nodesTitle")}
        subtitle={t("nodesSubtitle")}
        action={
          <Button type="button" className="rounded-[10px]" onClick={openCreate}>
            {t("addNode")}
          </Button>
        }
      />

      {provisionSimulate ? (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {t("simulateBanner")}
        </p>
      ) : null}
      {placeholders > 0 ? (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {t("placeholderBanner", { count: placeholders })}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t("nodeName")}</th>
              <th className="px-4 py-3 font-medium">{t("ddns")}</th>
              <th className="px-4 py-3 font-medium">{t("panel")}</th>
              <th className="px-4 py-3 font-medium">{t("wiring")}</th>
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
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs">
                      {node.hostMasked}:{node.port}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {node.inboundId ? t("inboundValue", { id: node.inboundId }) : t("inboundNone")}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={t(
                        node.wiring === "placeholder"
                          ? "wiring_placeholder"
                          : node.wiring === "local"
                            ? "wiring_local"
                            : "wiring_ready"
                      )}
                      tone={node.wiring === "ready" ? "ok" : "warn"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={t(node.status)}
                      tone={node.status === "online" ? "ok" : node.status === "degraded" ? "warn" : "neutral"}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{users}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(node)}>
                      {t("edit")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={probing}
                      onClick={() => {
                        void runProbe(node);
                      }}
                    >
                      {t("probe")}
                    </Button>
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
                    {rowProbe?.id === node.id ? (
                      <p className={`mt-1 text-xs ${rowProbe.ok ? "text-muted-foreground" : "text-destructive"}`}>
                        {rowProbe.text}
                      </p>
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

      <AdminDrawer
        open={editing !== null}
        title={editing && editing !== "new" ? t("editNode") : t("addNode")}
        onClose={() => setEditing(null)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const creating = editing === "new";
            if (!draft.name.trim() || !draft.ddns.trim() || (creating && (!draft.host.trim() || !draft.username.trim() || !draft.password))) {
              setFormError(t("required"));
              return;
            }
            void (async () => {
              const payload = { ...draft, product };
              const current = editing;
              const saved =
                current === "new"
                  ? await addNode(payload)
                  : current
                    ? await updateNode(current.id, payload)
                    : { ok: false as const, error: "required" };
              if (!saved.ok) {
                setFormError(t("required"));
                return;
              }
              setEditing(null);
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
            <input
              className={fieldClass}
              placeholder={editing && editing !== "new" ? editing.hostMasked : "203.0.113.10"}
              value={draft.host}
              onChange={(event) => setDraft({ ...draft, host: event.target.value })}
            />
          </Field>
          <Field label={t("port")}>
            <input className={fieldClass} value={draft.port} onChange={(event) => setDraft({ ...draft, port: event.target.value })} />
          </Field>
          <Field label={t("username")}>
            <input
              className={fieldClass}
              placeholder={editing && editing !== "new" ? editing.usernameMasked : ""}
              value={draft.username}
              onChange={(event) => setDraft({ ...draft, username: event.target.value })}
            />
          </Field>
          <Field label={t("password")}>
            <input
              type="password"
              className={fieldClass}
              placeholder={editing && editing !== "new" ? t("passwordKeep") : ""}
              value={draft.password}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
            />
          </Field>
          <Field label={t("inboundId")}>
            {inbounds.length ? (
              <select
                className={fieldClass}
                value={draft.inboundId}
                onChange={(event) => setDraft({ ...draft, inboundId: event.target.value })}
              >
                <option value="">{t("inboundNone")}</option>
                {inbounds.map((inbound) => (
                  <option key={inbound.id} value={inbound.id}>
                    #{inbound.id} {inbound.protocol} :{inbound.port} {inbound.remark}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={fieldClass}
                inputMode="numeric"
                value={draft.inboundId}
                onChange={(event) => setDraft({ ...draft, inboundId: event.target.value })}
              />
            )}
          </Field>
          {probeNote ? (
            <p className={`text-sm ${probeOk ? "text-muted-foreground" : "text-destructive"}`}>{probeNote}</p>
          ) : null}
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-[10px]"
              disabled={probing}
              onClick={() => {
                void runProbe();
              }}
            >
              {probing ? t("probing") : t("probe")}
            </Button>
            <Button type="submit" className="rounded-[10px]">
              {t("save")}
            </Button>
          </div>
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
