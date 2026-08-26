import {
  stepsFromProvision,
  type AdminCustomer,
  type AdminNode,
  type AdminPlan,
  type AdminPromoCode,
  type AdminState,
  type JobStep,
  type NodeRole,
} from "@/lib/admin";
import type { Plan, ProductId } from "@/lib/plans";
import {
  adminServiceFromPlanId,
  catalogPlanIds,
  isCatalogPlanId,
  productForAdminService,
  type AdminServiceId,
} from "@/lib/admin-service";

const empty: AdminState = {
  plans: [],
  nodes: [],
  customers: [],
  promoCodes: [],
  provision: null,
  migrate: null,
};

type Listener = () => void;

const listeners = new Set<Listener>();
let version = 0;
let memory: AdminState = empty;
let publicPlans: Plan[] = [];
let publicVersion = 0;
let provisionInFlight = false;
let changeInFlight = false;
let migrateInFlight = false;
let refreshPromise: Promise<void> | null = null;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function emitPublic() {
  publicVersion += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeAdmin(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAdminVersion() {
  return version;
}

export function getPublicPlanVersion() {
  return publicVersion;
}

export function getAdminState(): AdminState {
  return memory;
}

function patch(next: Partial<AdminState>) {
  memory = { ...memory, ...next };
  emit();
}

function mergeCustomers(incoming: AdminCustomer[]) {
  return incoming.map((customer) => {
    const previous = memory.customers.find((item) => item.id === customer.id);
    return {
      ...customer,
      planChange: previous?.planChange ?? customer.planChange,
    };
  });
}

async function readJson<T>(response: Response) {
  return (await response.json().catch(() => ({}))) as T;
}

export async function refreshAdmin() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const response = await fetch("/api/v1/admin/state", { credentials: "include" });
    if (!response.ok) {
      return;
    }

    const data = await readJson<Pick<AdminState, "plans" | "nodes" | "customers" | "promoCodes">>(response);
    patch({
      plans: data.plans ?? [],
      nodes: data.nodes ?? [],
      customers: mergeCustomers(data.customers ?? []),
      promoCodes: data.promoCodes ?? [],
    });
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function refreshPublicPlans() {
  const response = await fetch("/api/v1/plans", { credentials: "include" });
  if (!response.ok) {
    return;
  }

  const data = await readJson<{ plans?: Plan[] }>(response);
  publicPlans = data.plans ?? [];
  emitPublic();
}

export function listPlans(product: ProductId, includeHidden = true) {
  return memory.plans
    .filter((plan) => plan.product === product && (includeHidden || plan.visible))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listPlansForService(service: AdminServiceId) {
  const catalog = catalogPlanIds(service)
    .map((id) => memory.plans.find((plan) => plan.id === id))
    .filter((plan): plan is AdminPlan => Boolean(plan));
  const leftover = memory.plans
    .filter((plan) => !isCatalogPlanId(plan.id) && adminServiceFromPlanId(plan.id) === service)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return { catalog, leftover };
}

export function listAllPlansForService(service: AdminServiceId) {
  const { catalog, leftover } = listPlansForService(service);
  return [...catalog, ...leftover];
}

export function getLivePlan(id: string | null | undefined) {
  if (!id) {
    return null;
  }

  return (
    memory.plans.find((plan) => plan.id === id) ??
    publicPlans.find((plan) => plan.id === id) ??
    null
  );
}

export function listPublicPlans(product: ProductId) {
  return publicPlans.filter((plan) => plan.product === product);
}

export function listNodes(product: ProductId) {
  return memory.nodes.filter((node) => node.product === product);
}

export function listNodesForService(service: AdminServiceId) {
  return listNodes(productForAdminService(service));
}

export function listCustomers(product: ProductId) {
  return memory.customers
    .filter((customer) => customer.product === product)
    .slice()
    .sort((a, b) => a.email.localeCompare(b.email));
}

export function listCustomersForService(service: AdminServiceId) {
  return memory.customers
    .filter((customer) => adminServiceFromPlanId(customer.planId) === service)
    .slice()
    .sort((a, b) => a.email.localeCompare(b.email));
}

export function getCustomer(product: ProductId, id: string) {
  return memory.customers.find((customer) => customer.product === product && customer.id === id) ?? null;
}

export function getCustomerById(id: string) {
  return memory.customers.find((customer) => customer.id === id) ?? null;
}

export function countNodeUsers(nodeId: string) {
  return memory.customers.filter((customer) => customer.nodeIds.includes(nodeId)).length;
}

export function listPromoCodes() {
  return memory.promoCodes.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createPromoCode(input: { planId: string; code?: string; note?: string }) {
  const response = await fetch("/api/v1/admin/promo", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJson<{ code?: AdminPromoCode; error?: string }>(response);
  if (!response.ok || !data.code) {
    return { ok: false as const, error: data.error ?? "failed" };
  }
  await refreshAdmin();
  return { ok: true as const, code: data.code };
}

export async function deletePromoCode(id: string) {
  const response = await fetch(`/api/v1/admin/promo/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    return false;
  }
  await refreshAdmin();
  return true;
}

export async function upsertPlan(input: Omit<AdminPlan, "id"> & { id?: string }) {
  const response = await fetch(input.id ? `/api/v1/admin/plans/${input.id}` : "/api/v1/admin/plans", {
    method: input.id ? "PATCH" : "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJson<{ plan?: AdminPlan; error?: string }>(response);
  if (!response.ok || !data.plan) {
    return { ok: false as const, error: data.error ?? "failed" };
  }

  await Promise.all([refreshAdmin(), refreshPublicPlans()]);
  return { ok: true as const, plan: data.plan };
}

export async function deletePlan(id: string) {
  const response = await fetch(`/api/v1/admin/plans/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    return false;
  }

  await Promise.all([refreshAdmin(), refreshPublicPlans()]);
  return true;
}

export async function addNode(input: {
  product: ProductId;
  name: string;
  ddns: string;
  role: NodeRole;
  host: string;
  port: string;
  username: string;
  password: string;
}) {
  const response = await fetch("/api/v1/admin/nodes", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJson<{ node?: AdminNode; error?: string }>(response);
  if (!response.ok || !data.node) {
    return null;
  }

  await refreshAdmin();
  return data.node;
}

export async function deleteNode(id: string) {
  const response = await fetch(`/api/v1/admin/nodes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    return false;
  }

  await refreshAdmin();
  return true;
}

export async function runProvision(input: {
  product: ProductId;
  email: string;
  planId: string;
  expiresAt: string;
  memo: string;
  simulateFail?: boolean;
}) {
  if (provisionInFlight) {
    return { error: "busy" as const };
  }

  const steps = stepsFromProvision(input.product, "provisioning", "queued");
  patch({
    provision: {
      product: input.product,
      email: input.email,
      planId: input.planId,
      expiresAt: input.expiresAt,
      memo: input.memo,
      customerId: null,
      steps,
      failed: false,
    },
  });

  provisionInFlight = true;
  emit();

  try {
    const response = await fetch("/api/v1/admin/provision", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await readJson<{
      customer?: AdminCustomer;
      loginPassword?: string;
      error?: string;
    }>(response);

    if (!response.ok || !data.customer) {
      if (data.error === "already_active") {
        patch({ provision: null });
        return { error: "already_active" as const };
      }

      const current = memory.provision;
      if (current) {
        patch({
          provision: {
            ...current,
            failed: true,
            steps: stepsFromProvision(input.product, "failed", "xui"),
          },
        });
      }
      return { error: data.error ?? "failed" };
    }

    const customer = {
      ...data.customer,
      loginPassword: data.loginPassword,
    };

    patch({
      customers: upsertCustomer(memory.customers, customer),
      provision: memory.provision
        ? {
            ...memory.provision,
            customerId: customer.id,
            failed: customer.status === "failed",
            loginPassword: data.loginPassword,
            steps: stepsFromProvision(customer.product, customer.status, customer.provisionStep),
          }
        : memory.provision,
    });

    return { customer };
  } finally {
    provisionInFlight = false;
    emit();
  }
}

export function clearProvision() {
  patch({ provision: null });
}

export async function runPlanChange(input: {
  product: ProductId;
  customerId: string;
  toPlanId: string;
  simulateFail?: boolean;
}) {
  if (changeInFlight) {
    return false;
  }

  const customer = getCustomerById(input.customerId);
  if (!customer) {
    return false;
  }

  const pending: JobStep[] = [
    { id: "destroy", status: "running" },
    { id: "create", status: "pending" },
    { id: "db", status: "pending" },
  ];

  patch({
    customers: memory.customers.map((item) =>
      item.id === customer.id
        ? {
            ...item,
            planChange: {
              fromPlanId: customer.planId,
              toPlanId: input.toPlanId,
              steps: pending,
              failed: false,
            },
          }
        : item
    ),
  });

  changeInFlight = true;
  emit();

  try {
    const response = await fetch(`/api/v1/admin/customers/${input.customerId}/plan`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toPlanId: input.toPlanId, simulateFail: input.simulateFail }),
    });
    const data = await readJson<{
      customer?: AdminCustomer;
      steps?: JobStep[];
      failed?: boolean;
    }>(response);

    if (!response.ok || !data.customer) {
      patch({
        customers: memory.customers.map((item) =>
          item.id === customer.id && item.planChange
            ? {
                ...item,
                planChange: {
                  ...item.planChange,
                  failed: true,
                  steps: item.planChange.steps.map((step, index) =>
                    index === 0 ? { ...step, status: "failed" } : step
                  ),
                },
              }
            : item
        ),
      });
      return false;
    }

    patch({
      customers: upsertCustomer(memory.customers, {
        ...data.customer,
        planChange: {
          fromPlanId: customer.planId,
          toPlanId: input.toPlanId,
          steps: data.steps ?? pending,
          failed: Boolean(data.failed),
        },
      }),
    });
    return !data.failed;
  } finally {
    changeInFlight = false;
    emit();
  }
}

export function clearPlanChange(customerId: string) {
  patch({
    customers: memory.customers.map((item) => (item.id === customerId ? { ...item, planChange: null } : item)),
  });
}

export async function runMigrate(input: { product: ProductId; fromNodeId: string; toNodeId: string }) {
  if (migrateInFlight || input.fromNodeId === input.toNodeId) {
    return false;
  }

  const total = countNodeUsers(input.fromNodeId);
  patch({
    migrate: {
      product: input.product,
      fromNodeId: input.fromNodeId,
      toNodeId: input.toNodeId,
      total,
      done: 0,
      running: true,
    },
  });

  migrateInFlight = true;
  emit();

  try {
    const response = await fetch("/api/v1/admin/nodes/migrate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await readJson<{ total?: number; done?: number }>(response);
    if (!response.ok) {
      patch({
        migrate: memory.migrate ? { ...memory.migrate, running: false } : memory.migrate,
      });
      return false;
    }

    await refreshAdmin();
    patch({
      migrate: {
        product: input.product,
        fromNodeId: input.fromNodeId,
        toNodeId: input.toNodeId,
        total: data.total ?? total,
        done: data.done ?? data.total ?? total,
        running: false,
      },
    });
    return true;
  } finally {
    migrateInFlight = false;
    emit();
  }
}

export function clearMigrate() {
  patch({ migrate: null });
}

export async function recordRotate(customerId: string) {
  const response = await fetch(`/api/v1/admin/customers/${customerId}/rotate`, {
    method: "POST",
    credentials: "include",
  });
  const data = await readJson<{ customer?: AdminCustomer }>(response);
  if (!response.ok || !data.customer) {
    return false;
  }

  patch({ customers: upsertCustomer(memory.customers, data.customer) });
  return true;
}

export function isProvisionInFlight() {
  return provisionInFlight;
}

export function isChangeInFlight() {
  return changeInFlight;
}

export function isMigrateInFlight() {
  return migrateInFlight;
}

function upsertCustomer(customers: AdminCustomer[], next: AdminCustomer) {
  const exists = customers.some((item) => item.id === next.id);
  return exists ? customers.map((item) => (item.id === next.id ? { ...item, ...next } : item)) : [next, ...customers];
}
