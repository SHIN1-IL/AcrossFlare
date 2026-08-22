import {
  nextcloudAdminPassword,
  nextcloudAdminUser,
  nextcloudApiBaseUrl,
} from "@/lib/provision/config";

export class NextcloudError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NextcloudError";
  }
}

function basicAuth(user: string, password: string) {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

async function ocsRequest(
  path: string,
  init: RequestInit & { user?: string; password?: string } = {}
) {
  const user = init.user ?? nextcloudAdminUser();
  const password = init.password ?? nextcloudAdminPassword();
  if (!password) {
    throw new NextcloudError("nextcloud_not_configured");
  }

  const headers = new Headers(init.headers);
  headers.set("OCS-APIRequest", "true");
  headers.set("Accept", "application/json");
  headers.set("Authorization", basicAuth(user, password));

  const response = await fetch(`${nextcloudApiBaseUrl()}${path}`, {
    method: init.method,
    headers,
    body: init.body,
  });

  const body = (await response.json().catch(() => null)) as {
    ocs?: { meta?: { statuscode?: number; message?: string }; data?: { apppassword?: string } };
  } | null;
  const status = body?.ocs?.meta?.statuscode ?? response.status;

  return { response, body, status };
}

export async function createNextcloudUser(input: {
  userId: string;
  password: string;
  email: string;
  quotaGb: number;
}) {
  const created = await ocsRequest("/ocs/v1.php/cloud/users", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      userid: input.userId,
      password: input.password,
      displayName: input.email,
      email: input.email,
      quota: `${input.quotaGb} GB`,
    }),
  });

  if (created.status !== 100 && created.status !== 102 && !created.response.ok) {
    throw new NextcloudError(created.body?.ocs?.meta?.message || "nextcloud_create_failed");
  }

  const quota = await ocsRequest(`/ocs/v1.php/cloud/users/${encodeURIComponent(input.userId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      key: "quota",
      value: `${input.quotaGb} GB`,
    }),
  });

  if (quota.status !== 100 && !quota.response.ok) {
    throw new NextcloudError(quota.body?.ocs?.meta?.message || "nextcloud_quota_failed");
  }
}

export async function createNextcloudAppPassword(input: { userId: string; password: string }) {
  const issued = await ocsRequest("/ocs/v2.php/core/getapppassword", {
    method: "GET",
    user: input.userId,
    password: input.password,
  });

  const appPassword = issued.body?.ocs?.data?.apppassword;
  if (!appPassword) {
    throw new NextcloudError(issued.body?.ocs?.meta?.message || "nextcloud_app_password_failed");
  }

  return appPassword;
}
