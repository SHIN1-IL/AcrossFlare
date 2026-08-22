import type { Plan, ProductId } from "@/lib/plans";

export type JobStepStatus = "pending" | "running" | "done" | "failed";

export type JobStep = {
  id: string;
  status: JobStepStatus;
};

export type AdminPlan = Plan & {
  visible: boolean;
};

export type NodeRole = "bandwagon" | "racknerd";
export type NodeHealth = "online" | "degraded" | "offline";

export type AdminNode = {
  id: string;
  product: ProductId;
  name: string;
  ddns: string;
  role: NodeRole;
  status: NodeHealth;
  hostMasked: string;
  portMasked: string;
  usernameMasked: string;
  passwordMasked: string;
};

export type GlobalCredentials = {
  kind: "global";
  uuid: string;
  deepLink: string;
  yamlUrl: string;
  yamlBody: string;
  nextcloudUrl: string;
  nextcloudAppPassword: string;
  nodes: string[];
};

export type MarketingCredentials = {
  kind: "marketing";
  exitIp: string;
  region: string;
  httpUrl: string;
  socksUrl: string;
  wgConfig: string;
  lastRotateAt: string | null;
};

export type CustomerCredentials = GlobalCredentials | MarketingCredentials;

export type RotateEvent = {
  id: string;
  at: string;
  fromIp: string;
  toIp: string;
};

export type CustomerStatus = "active" | "provisioning" | "unpaid" | "failed";

export type PlanChangeJob = {
  fromPlanId: string;
  toPlanId: string;
  steps: JobStep[];
  failed: boolean;
};

export type AdminCustomer = {
  id: string;
  product: ProductId;
  email: string;
  planId: string;
  planName: string;
  expiresAt: string;
  memo: string;
  status: CustomerStatus;
  nodeIds: string[];
  createdAt: string;
  credentials: CustomerCredentials | null;
  rotateHistory: RotateEvent[];
  planChange: PlanChangeJob | null;
  provisionStep: string;
  loginPassword?: string;
};

export type ProvisionSession = {
  product: ProductId;
  email: string;
  planId: string;
  expiresAt: string;
  memo: string;
  customerId: string | null;
  steps: JobStep[];
  failed: boolean;
  loginPassword?: string;
};

export type MigrateJob = {
  product: ProductId;
  fromNodeId: string;
  toNodeId: string;
  total: number;
  done: number;
  running: boolean;
};

export type AdminState = {
  plans: AdminPlan[];
  nodes: AdminNode[];
  customers: AdminCustomer[];
  provision: ProvisionSession | null;
  migrate: MigrateJob | null;
};

export function maskSecret(value: string) {
  if (!value) {
    return "••••••••";
  }
  if (value.length <= 3) {
    return "•".repeat(8);
  }
  return `${value.slice(0, 2)}${"•".repeat(Math.min(10, value.length))}${value.slice(-1)}`;
}

export function maskHost(host: string) {
  const trimmed = host.trim();
  if (!trimmed) {
    return "•••.•••.•••.•••";
  }
  if (trimmed.includes(".")) {
    const parts = trimmed.split(".");
    return parts.map((part, index) => (index === parts.length - 1 ? part : "•••")).join(".");
  }
  return maskSecret(trimmed);
}

export function provisionSteps(product: ProductId): JobStep[] {
  const ids = product === "global" ? ["xui", "nextcloud", "ready"] : ["xui", "ready"];
  return ids.map((id) => ({ id, status: "pending" as const }));
}

export function planChangeSteps(): JobStep[] {
  return [
    { id: "destroy", status: "pending" },
    { id: "create", status: "pending" },
    { id: "db", status: "pending" },
  ];
}

export function stepsFromProvision(
  product: ProductId,
  status: CustomerStatus,
  provisionStep: string
): JobStep[] {
  const steps = provisionSteps(product);
  if (status === "active") {
    return steps.map((step) => ({ ...step, status: "done" as const }));
  }

  const current = provisionStep === "queued" || provisionStep === "" ? "xui" : provisionStep;
  const index = Math.max(
    0,
    steps.findIndex((step) => step.id === current)
  );
  const failed = status === "failed";

  return steps.map((step, stepIndex) => {
    if (stepIndex < index) {
      return { ...step, status: "done" as const };
    }
    if (stepIndex === index) {
      return {
        ...step,
        status: failed ? "failed" : status === "provisioning" ? "running" : "pending",
      };
    }
    return { ...step, status: "pending" as const };
  });
}

export function slugPlanId(product: ProductId, name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plan";
  return `${product}-${slug}`;
}
