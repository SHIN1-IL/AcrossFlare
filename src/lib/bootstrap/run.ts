import {
  BootstrapJobStatus,
  InstanceGroupStatus,
  NodeHealth,
  NodeRole,
  Product,
  type NodeBootstrapJob,
} from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { dnsRecordAlreadySet, upsertNodeARecord } from "@/lib/bootstrap/dns";
import { buildRemoteInstallScript } from "@/lib/bootstrap/remote-install";
import { sshRunScript, type SshAuth } from "@/lib/bootstrap/ssh";
import { ensureBootstrapRealityInbound } from "@/lib/bootstrap/xui-inbound";
import { isProvisionSimulate } from "@/lib/provision/config";
import { chooseBootstrapTarget, DAILY_BOOTSTRAP_LIMIT, utcDayStart } from "@/lib/provision/capacity-expand";
import { nodeWiring } from "@/lib/provision/node-wiring";
import { probeXuiPanel } from "@/lib/provision/xui";

export class BootstrapError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = "BootstrapError";
  }
}

export type BootstrapSecrets = {
  sshPassword?: string;
  sshPrivateKey?: string;
  panelPassword?: string;
};

async function logLine(jobId: string, line: string) {
  const current = await prisma.nodeBootstrapJob.findUnique({ where: { id: jobId }, select: { log: true } });
  await prisma.nodeBootstrapJob.update({
    where: { id: jobId },
    data: { log: `${current?.log || ""}${new Date().toISOString()} ${line}\n` },
  });
}

export async function assertBootstrapQuota() {
  const count = await prisma.nodeBootstrapJob.count({
    where: { createdAt: { gte: utcDayStart() } },
  });
  if (count >= DAILY_BOOTSTRAP_LIMIT) {
    throw new BootstrapError("bootstrap_daily_limit");
  }
}

export async function createBootstrapJob(input: {
  product: Product;
  role: NodeRole;
  provider?: string;
  poolId?: string | null;
  groupId?: string | null;
  name: string;
  ddnsHost: string;
  sshHost: string;
  sshPort?: number;
  sshUser?: string;
  panelPort?: number;
  vlessPort?: number;
  realityDest?: string;
}) {
  await assertBootstrapQuota();

  const name = input.name.trim();
  const ddnsHost = input.ddnsHost.trim().toLowerCase().replace(/\.$/, "");
  const sshHost = input.sshHost.trim();
  if (!name || !ddnsHost || !sshHost) {
    throw new BootstrapError("required");
  }
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(ddnsHost)) {
    throw new BootstrapError("ddns_invalid");
  }
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(sshHost)) {
    throw new BootstrapError("ssh_host_must_be_ipv4");
  }

  return prisma.nodeBootstrapJob.create({
    data: {
      status: BootstrapJobStatus.QUEUED,
      product: input.product,
      role: input.role,
      provider: (input.provider ?? "").trim().slice(0, 64),
      poolId: input.poolId || null,
      groupId: input.groupId || null,
      name,
      ddnsHost,
      sshHost,
      sshPort: input.sshPort || 22,
      sshUser: (input.sshUser || "root").trim() || "root",
      panelPort: input.panelPort || 2053,
      vlessPort: input.vlessPort || 443,
      realityDest: (input.realityDest || "www.microsoft.com").trim() || "www.microsoft.com",
    },
  });
}

export async function runBootstrapJob(jobId: string, secrets: BootstrapSecrets) {
  const job = await prisma.nodeBootstrapJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new BootstrapError("not_found");
  }
  if (job.status !== BootstrapJobStatus.QUEUED && job.status !== BootstrapJobStatus.RUNNING) {
    return job;
  }

  await prisma.nodeBootstrapJob.update({
    where: { id: jobId },
    data: { status: BootstrapJobStatus.RUNNING, error: "", updatedAt: new Date() },
  });

  try {
    const panelUser = "afadmin";
    const panelPassword =
      secrets.panelPassword?.trim() || `Af${randomBytes(9).toString("base64url")}!`;

    if (isProvisionSimulate()) {
      await logLine(jobId, "simulate: skipping SSH/install");
      const node = await persistNode(job, {
        panelUser,
        panelPassword: "simulated",
        inboundId: 1,
        realityPublicKey: "sim".padEnd(64, "0"),
        realityShortId: "abcd1234",
        realityServerName: job.realityDest,
        realityFingerprint: "chrome",
      });
      await attachNodeToGroup(job, node.id);
      return finishOk(jobId, node.id, "simulate complete");
    }

    if (!secrets.sshPassword && !secrets.sshPrivateKey) {
      throw new BootstrapError("ssh_auth_missing");
    }

    const auth: SshAuth = {
      host: job.sshHost,
      port: job.sshPort,
      username: job.sshUser,
      password: secrets.sshPassword,
      privateKey: secrets.sshPrivateKey,
    };

    await logLine(jobId, "dns: upsert A record (DNS only)");
    const dns = await upsertNodeARecord({ fqdn: job.ddnsHost, ipv4: job.sshHost });
    if (!dns.ok) {
      const already = await dnsRecordAlreadySet(job.ddnsHost, job.sshHost);
      if (!already) {
        throw new BootstrapError("dns_failed", dns.error);
      }
      await logLine(
        jobId,
        `dns: api failed (${dns.error}); public A already ${job.sshHost}, continuing`
      );
    } else if (dns.skipped) {
      await logLine(jobId, `dns: skipped (${dns.reason})`);
    } else {
      await logLine(jobId, `dns: ok record=${dns.recordId}`);
    }

    await logLine(jobId, "ssh: remote docker + 3x-ui install");
    const script = buildRemoteInstallScript({
      panelUser,
      panelPassword,
      panelPort: job.panelPort,
      vlessPort: job.vlessPort,
    });
    const remote = await sshRunScript(auth, script);
    await logLine(jobId, `ssh: exit=${remote.code}`);
    if (remote.stdout.trim()) {
      await logLine(jobId, remote.stdout.trim().slice(-2000));
    }
    if (remote.code !== 0 || !remote.stdout.includes("AF_BOOTSTRAP_PANEL_READY")) {
      throw new BootstrapError(
        "remote_install_failed",
        `${remote.stderr}\n${remote.stdout}`.trim().slice(-500) || "install_failed"
      );
    }

    const panelTarget = {
      host: job.sshHost,
      port: job.panelPort,
      username: panelUser,
      password: panelPassword,
    };

    await logLine(jobId, "xui: probe panel");
    let probe = await probeXuiPanel(panelTarget);
    for (let attempt = 0; attempt < 10 && !probe.ok; attempt += 1) {
      await sleep(3000);
      probe = await probeXuiPanel(panelTarget);
    }
    if (!probe.ok) {
      throw new BootstrapError("panel_probe_failed", probe.error);
    }

    await logLine(jobId, "xui: ensure REALITY inbound");
    const reality = await ensureBootstrapRealityInbound(panelTarget, {
      vlessPort: job.vlessPort,
      realityDest: job.realityDest,
      remark: `af-${job.name}`.slice(0, 32),
    });

    await logLine(jobId, `xui: inbound=${reality.inboundId}`);
    const node = await persistNode(job, {
      panelUser,
      panelPassword,
      inboundId: reality.inboundId,
      realityPublicKey: reality.realityPublicKey,
      realityShortId: reality.realityShortId,
      realityServerName: reality.realityServerName,
      realityFingerprint: reality.realityFingerprint,
      vlessPort: reality.vlessPort,
    });
    await attachNodeToGroup(job, node.id);
    return finishOk(jobId, node.id, "bootstrap succeeded");
  } catch (error) {
    const code = error instanceof BootstrapError ? error.code : "bootstrap_failed";
    const message = error instanceof Error ? error.message : "bootstrap_failed";
    await logLine(jobId, `error: ${code} ${message}`);
    return prisma.nodeBootstrapJob.update({
      where: { id: jobId },
      data: {
        status: BootstrapJobStatus.FAILED,
        error: `${code}:${message}`.slice(0, 500),
        completedAt: new Date(),
      },
    });
  }
}

async function persistNode(
  job: NodeBootstrapJob,
  creds: {
    panelUser: string;
    panelPassword: string;
    inboundId: number;
    realityPublicKey: string;
    realityShortId: string;
    realityServerName: string;
    realityFingerprint: string;
    vlessPort?: number;
  }
) {
  return prisma.node.create({
    data: {
      product: job.product,
      name: job.name,
      ddns: job.ddnsHost,
      role: job.role,
      provider: job.provider,
      status: NodeHealth.ONLINE,
      host: job.sshHost,
      port: job.panelPort,
      username: creds.panelUser,
      password: creds.panelPassword,
      inboundId: creds.inboundId,
      vlessPort: creds.vlessPort ?? job.vlessPort,
      realityPublicKey: creds.realityPublicKey,
      realityShortId: creds.realityShortId,
      realityServerName: creds.realityServerName,
      realityFingerprint: creds.realityFingerprint,
    },
  });
}

async function linkNodeToGroup(groupId: string, nodeId: string) {
  const maxSort = await prisma.instanceGroupNode.aggregate({
    where: { groupId },
    _max: { sortOrder: true },
  });
  await prisma.instanceGroupNode.upsert({
    where: { groupId_nodeId: { groupId, nodeId } },
    update: {},
    create: {
      groupId,
      nodeId,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });
}

async function attachNodeToGroup(job: NodeBootstrapJob, nodeId: string) {
  if (!job.poolId && !job.groupId) {
    await logLine(job.id, "capacity: no pool/group requested");
    return;
  }

  if (job.groupId) {
    await linkNodeToGroup(job.groupId, nodeId);
    await logLine(job.id, `capacity: attached node to group ${job.groupId}`);
    return;
  }

  if (!job.poolId) {
    return;
  }

  const pool = await prisma.capacityPool.findUnique({ where: { id: job.poolId } });
  const groups = await prisma.instanceGroup.findMany({
    where: { poolId: job.poolId },
    orderBy: { createdAt: "asc" },
    include: {
      nodes: {
        include: {
          node: { select: { role: true, status: true, host: true, password: true } },
        },
      },
    },
  });

  const decision = chooseBootstrapTarget({
    maxSelectable: pool?.maxSelectable ?? 1,
    incomingRole: job.role,
    groups: groups.map((group) => ({
      id: group.id,
      status: group.status,
      seatsUsed: group.seatsUsed,
      seatsMax: group.seatsMax,
      createdAt: group.createdAt,
      primaryOnline: group.nodes.filter(
        (row) =>
          row.node.role === NodeRole.PRIMARY &&
          row.node.status !== NodeHealth.OFFLINE &&
          nodeWiring(row.node) !== "placeholder"
      ).length,
    })),
  });

  let groupId = decision.groupId;
  if (!groupId) {
    const created = await prisma.instanceGroup.create({
      data: {
        poolId: job.poolId,
        name: `${job.poolId}-${Date.now().toString(36)}`,
        status: InstanceGroupStatus.OPENING,
        seatsUsed: 0,
        seatsMax: pool?.seatsMaxDefault ?? 10,
      },
    });
    groupId = created.id;
  }

  await linkNodeToGroup(groupId, nodeId);
  if (decision.status === "READY") {
    await prisma.instanceGroup.update({
      where: { id: groupId },
      data: { status: InstanceGroupStatus.READY },
    });
  }
  await logLine(job.id, `capacity: attached node to group ${groupId} (${decision.status})`);
}

async function finishOk(jobId: string, nodeId: string, message: string) {
  await logLine(jobId, message);
  return prisma.nodeBootstrapJob.update({
    where: { id: jobId },
    data: {
      status: BootstrapJobStatus.SUCCEEDED,
      nodeId,
      completedAt: new Date(),
      error: "",
    },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listRecentBootstrapJobs(limit = 30) {
  const jobs = await prisma.nodeBootstrapJob.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return jobs.map(toAdminBootstrapJob);
}

export function toAdminBootstrapJob(job: NodeBootstrapJob) {
  return {
    id: job.id,
    status: job.status.toLowerCase(),
    product: job.product,
    role: job.role === NodeRole.FAILOVER ? "failover" : "primary",
    provider: job.provider,
    poolId: job.poolId,
    groupId: job.groupId,
    name: job.name,
    ddnsHost: job.ddnsHost,
    sshHost: job.sshHost,
    sshPort: job.sshPort,
    nodeId: job.nodeId,
    log: job.log,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}
