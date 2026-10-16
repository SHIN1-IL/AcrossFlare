"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { AdminDrawer, fieldClass } from "@/components/admin/admin-drawer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CapacityAlerts } from "@/components/admin/capacity-alerts";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/hooks/use-admin";
import {
  addNode,
  bootstrapNode,
  clearMigrate,
  countNodeUsers,
  deleteNode,
  listNodes,
  probeNode,
  runMigrate,
  updateNode,
} from "@/lib/admin-store";
import type { AdminNode, NodeRole, XuiProbeInbound } from "@/lib/admin";
import { poolsForAdminService } from "@/lib/admin-overview";
import type { AdminServiceId } from "@/lib/admin-service";
import type { ProductId } from "@/lib/plans";

const emptyDraft = {
  name: "",
  ddns: "",
  role: "primary" as NodeRole,
  provider: "",
  host: "",
  port: "2053",
  username: "",
  password: "",
  inboundId: "",
  vlessPort: "443",
  realityPublicKey: "",
  realityShortId: "",
  realityServerName: "",
  realityFingerprint: "chrome",
};

const emptyBootstrap = {
  name: "",
  ddnsHost: "",
  role: "primary" as NodeRole,
  provider: "",
  poolId: "",
  sshHost: "",
  sshPort: "22",
  sshUser: "root",
  sshPassword: "",
  sshPrivateKey: "",
  panelPort: "2053",
  vlessPort: "443",
  realityDest: "www.microsoft.com",
};

export function NodeManager({
  product,
  service,
  bootstrapRequest,
}: {
  product: ProductId;
  service: AdminServiceId;
  bootstrapRequest?: { poolId: string; role: NodeRole } | null;
}) {
  const t = useTranslations("admin");
  const { migrate, migrating, provisionSimulate, capacityPools, bootstrapQuota } = useAdmin();
  const nodes = listNodes(product);
  const scopedPools = poolsForAdminService(service, capacityPools ?? []);
  const requestedPool = bootstrapRequest?.poolId
    ? (capacityPools ?? []).find(
        (pool) => pool.id === bootstrapRequest.poolId && !scopedPools.some((item) => item.id === pool.id)
      )
    : null;
  const poolsForProduct = requestedPool ? [...scopedPools, requestedPool] : scopedPools;
  const [advanced, setAdvanced] = useState(false);
  const [editing, setEditing] = useState<AdminNode | "new" | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapDraft, setBootstrapDraft] = useState(emptyBootstrap);
  const [bootstrapError, setBootstrapError] = useState("");
  const [bootstrapLog, setBootstrapLog] = useState("");
  const [bootstrapBusy, setBootstrapBusy] = useState(false);
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
  const openedBootstrap = useRef(false);

  function openBootstrap(poolId?: string, role: NodeRole = "primary") {
    const fallback = poolsForProduct.find((pool) => pool.full)?.id ?? poolsForProduct[0]?.id ?? "";
    setBootstrapping(true);
    setBootstrapDraft({
      ...emptyBootstrap,
      poolId: poolId || fallback,
      role,
    });
    setBootstrapError("");
    setBootstrapLog("");
  }

  useEffect(() => {
    if (!bootstrapRequest || openedBootstrap.current) {
      return;
    }
    openedBootstrap.current = true;
    setBootstrapping(true);
    setBootstrapDraft({
      ...emptyBootstrap,
      poolId: bootstrapRequest.poolId,
      role: bootstrapRequest.role,
    });
    setBootstrapError("");
    setBootstrapLog("");
  }, [bootstrapRequest]);

  function bootstrapErrorText(code: string) {
    if (code === "bootstrap_daily_limit") {
      return t("bootstrapDailyLimit", { limit: bootstrapQuota.limit });
    }
    return code;
  }

  const job = migrate?.product === product ? migrate : null;
  const sourceCount = source ? countNodeUsers(source.id) : 0;
  const placeholders = nodes.filter((node) => node.wiring === "placeholder").length;
  const degraded = nodes.filter((node) => node.status === "degraded");

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
      provider: node.provider,
      host: "",
      port: String(node.port || 2053),
      username: "",
      password: "",
      inboundId: node.inboundId ? String(node.inboundId) : "",
      vlessPort: String(node.vlessPort || 443),
      realityPublicKey: node.realityPublicKey,
      realityShortId: node.realityShortId,
      realityServerName: node.realityServerName,
      realityFingerprint: node.realityFingerprint,
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
        return picked
          ? { ...current, inboundId: String(picked.id), vlessPort: String(picked.port || 443) }
          : current;
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
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="rounded-[10px]" onClick={() => openBootstrap()}>
              {t("bootstrapNode")}
            </Button>
            <Button
              type="button"
              variant={advanced ? "secondary" : "outline"}
              className="rounded-[10px]"
              aria-pressed={advanced}
              onClick={() => {
                setAdvanced((open) => {
                  if (open) {
                    setSource(null);
                    setEditing(null);
                  }
                  return !open;
                });
              }}
            >
              {t("nodesAdvanced")}
            </Button>
          </div>
        }
      />

      <CapacityAlerts
        pools={poolsForProduct}
        quota={bootstrapQuota}
        allowAdd
        onAdd={openBootstrap}
      />
      {provisionSimulate ? (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {t("simulateBanner")}
        </p>
      ) : null}
      {poolsForProduct.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {poolsForProduct.map((pool) => (
            <div
              key={pool.id}
              className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
            >
              <p className="font-medium text-foreground">{pool.name}</p>
              <p className="mt-1 text-muted-foreground">
                {t("capacitySeats", {
                  remaining: pool.seatsRemaining,
                  used: pool.seatsUsed,
                  max: pool.seatsMax,
                })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("capacitySelectable", { count: pool.maxSelectable })}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      {advanced ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="text-sm text-muted-foreground">{t("nodesAdvancedHint")}</p>
          <Button type="button" variant="outline" className="rounded-[10px]" onClick={openCreate}>
            {t("addNode")}
          </Button>
        </div>
      ) : null}
      {degraded.length ? (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {t("degradedBanner", { names: degraded.map((node) => node.name).join(", ") })}
        </p>
      ) : null}
      {placeholders > 0 ? (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {t("placeholderBanner", { count: placeholders })}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className={`w-full text-left text-sm ${advanced ? "min-w-[980px]" : "min-w-[640px]"}`}>
          <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t("nodeName")}</th>
              <th className="px-4 py-3 font-medium">{t("role")}</th>
              <th className="px-4 py-3 font-medium">{t("ddns")}</th>
              {advanced ? <th className="px-4 py-3 font-medium">{t("panel")}</th> : null}
              {advanced ? <th className="px-4 py-3 font-medium">{t("wiring")}</th> : null}
              <th className="px-4 py-3 font-medium">{t("nodeStatus")}</th>
              <th className="px-4 py-3 font-medium">{t("users")}</th>
              {advanced ? <th className="px-4 py-3 font-medium" /> : null}
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => {
              const users = countNodeUsers(node.id);
              return (
                <tr key={node.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{node.name}</td>
                  <td className="px-4 py-3 text-xs">
                    {node.role === "failover" ? t("roleFailover") : t("rolePrimary")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{node.ddns}</td>
                  {advanced ? (
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs">
                        {node.hostMasked}:{node.port}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {node.inboundId ? t("inboundValue", { id: node.inboundId }) : t("inboundNone")}
                      </p>
                    </td>
                  ) : null}
                  {advanced ? (
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
                  ) : null}
                  <td className="px-4 py-3">
                    <StatusPill
                      label={t(node.status)}
                      tone={node.status === "online" ? "ok" : node.status === "degraded" ? "warn" : "neutral"}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{users}</td>
                  {advanced ? (
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
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {advanced && source ? (
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
        open={bootstrapping}
        title={t("bootstrapNode")}
        onClose={() => !bootstrapBusy && setBootstrapping(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              !bootstrapDraft.name.trim() ||
              !bootstrapDraft.ddnsHost.trim() ||
              !bootstrapDraft.sshHost.trim() ||
              (!bootstrapDraft.sshPassword.trim() && !bootstrapDraft.sshPrivateKey.trim())
            ) {
              setBootstrapError(t("required"));
              return;
            }
            setBootstrapBusy(true);
            setBootstrapError("");
            setBootstrapLog(t("bootstrapRunning"));
            void (async () => {
              const result = await bootstrapNode({
                product,
                role: bootstrapDraft.role,
                provider: bootstrapDraft.provider,
                poolId: bootstrapDraft.poolId || undefined,
                name: bootstrapDraft.name,
                ddnsHost: bootstrapDraft.ddnsHost,
                sshHost: bootstrapDraft.sshHost,
                sshPort: bootstrapDraft.sshPort,
                sshUser: bootstrapDraft.sshUser,
                sshPassword: bootstrapDraft.sshPassword || undefined,
                sshPrivateKey: bootstrapDraft.sshPrivateKey || undefined,
                panelPort: bootstrapDraft.panelPort,
                vlessPort: bootstrapDraft.vlessPort,
                realityDest: bootstrapDraft.realityDest,
              });
              setBootstrapBusy(false);
              if (!result.ok) {
                setBootstrapError(
                  result.error ? bootstrapErrorText(result.error) : t("bootstrapFailed")
                );
                setBootstrapLog(result.job?.log || "");
                return;
              }
              setBootstrapLog(result.job?.log || t("bootstrapDone"));
              setBootstrapping(false);
            })();
          }}
        >
          <p className="text-xs text-muted-foreground">{t("bootstrapHint")}</p>
          <Field label={t("nodeName")}>
            <input
              className={fieldClass}
              value={bootstrapDraft.name}
              onChange={(event) => setBootstrapDraft({ ...bootstrapDraft, name: event.target.value })}
            />
          </Field>
          <Field label={t("ddns")}>
            <input
              className={fieldClass}
              placeholder="node-xx.acrossflare.com"
              value={bootstrapDraft.ddnsHost}
              onChange={(event) => setBootstrapDraft({ ...bootstrapDraft, ddnsHost: event.target.value })}
            />
          </Field>
          <Field label={t("role")}>
            <select
              className={fieldClass}
              value={bootstrapDraft.role}
              onChange={(event) =>
                setBootstrapDraft({ ...bootstrapDraft, role: event.target.value as NodeRole })
              }
            >
              <option value="primary">{t("rolePrimary")}</option>
              <option value="failover">{t("roleFailover")}</option>
            </select>
          </Field>
          <Field label={t("provider")}>
            <input
              className={fieldClass}
              placeholder={t("providerPlaceholder")}
              value={bootstrapDraft.provider}
              onChange={(event) => setBootstrapDraft({ ...bootstrapDraft, provider: event.target.value })}
            />
          </Field>
          {poolsForProduct.length ? (
            <Field label={t("bootstrapPool")}>
              <select
                className={fieldClass}
                value={bootstrapDraft.poolId}
                onChange={(event) => setBootstrapDraft({ ...bootstrapDraft, poolId: event.target.value })}
              >
                <option value="">{t("bootstrapPoolNone")}</option>
                {poolsForProduct.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label={t("bootstrapSshHost")}>
            <input
              className={fieldClass}
              placeholder="203.0.113.10"
              value={bootstrapDraft.sshHost}
              onChange={(event) => setBootstrapDraft({ ...bootstrapDraft, sshHost: event.target.value })}
            />
          </Field>
          <Field label={t("bootstrapSshPort")}>
            <input
              className={fieldClass}
              value={bootstrapDraft.sshPort}
              onChange={(event) => setBootstrapDraft({ ...bootstrapDraft, sshPort: event.target.value })}
            />
          </Field>
          <Field label={t("bootstrapSshUser")}>
            <input
              className={fieldClass}
              value={bootstrapDraft.sshUser}
              onChange={(event) => setBootstrapDraft({ ...bootstrapDraft, sshUser: event.target.value })}
            />
          </Field>
          <Field label={t("bootstrapSshPassword")}>
            <input
              type="password"
              className={fieldClass}
              value={bootstrapDraft.sshPassword}
              onChange={(event) => setBootstrapDraft({ ...bootstrapDraft, sshPassword: event.target.value })}
            />
          </Field>
          <Field label={t("bootstrapSshKey")}>
            <textarea
              className={fieldClass}
              rows={3}
              value={bootstrapDraft.sshPrivateKey}
              onChange={(event) =>
                setBootstrapDraft({ ...bootstrapDraft, sshPrivateKey: event.target.value })
              }
            />
          </Field>
          <Field label={t("realityServerName")}>
            <input
              className={fieldClass}
              value={bootstrapDraft.realityDest}
              onChange={(event) => setBootstrapDraft({ ...bootstrapDraft, realityDest: event.target.value })}
            />
          </Field>
          {bootstrapError ? <p className="text-sm text-destructive">{bootstrapError}</p> : null}
          {bootstrapLog ? (
            <pre className="max-h-48 overflow-auto rounded-xl bg-surface-2 p-3 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap">
              {bootstrapLog}
            </pre>
          ) : null}
          <Button type="submit" className="rounded-[10px]" disabled={bootstrapBusy}>
            {bootstrapBusy ? t("bootstrapRunning") : t("bootstrapRun")}
          </Button>
        </form>
      </AdminDrawer>

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
              <option value="primary">{t("rolePrimary")}</option>
              <option value="failover">{t("roleFailover")}</option>
            </select>
          </Field>
          <Field label={t("provider")}>
            <input
              className={fieldClass}
              placeholder={t("providerPlaceholder")}
              value={draft.provider}
              onChange={(event) => setDraft({ ...draft, provider: event.target.value })}
            />
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
          <p className="text-xs font-medium tracking-wide text-primary uppercase">{t("realitySection")}</p>
          <Field label={t("vlessPort")}>
            <input
              className={fieldClass}
              inputMode="numeric"
              value={draft.vlessPort}
              onChange={(event) => setDraft({ ...draft, vlessPort: event.target.value })}
            />
          </Field>
          <Field label={t("realityPublicKey")}>
            <input
              className={fieldClass}
              placeholder={editing && editing !== "new" && editing.realityPublicKey ? t("passwordKeep") : ""}
              value={draft.realityPublicKey}
              onChange={(event) => setDraft({ ...draft, realityPublicKey: event.target.value })}
            />
          </Field>
          <Field label={t("realityShortId")}>
            <input
              className={fieldClass}
              value={draft.realityShortId}
              onChange={(event) => setDraft({ ...draft, realityShortId: event.target.value })}
            />
          </Field>
          <Field label={t("realityServerName")}>
            <input
              className={fieldClass}
              placeholder="www.microsoft.com"
              value={draft.realityServerName}
              onChange={(event) => setDraft({ ...draft, realityServerName: event.target.value })}
            />
          </Field>
          <Field label={t("realityFingerprint")}>
            <input
              className={fieldClass}
              placeholder="chrome"
              value={draft.realityFingerprint}
              onChange={(event) => setDraft({ ...draft, realityFingerprint: event.target.value })}
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
