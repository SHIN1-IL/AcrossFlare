export function isProvisionSimulate() {
  if (process.env.PROVISION_MODE === "live") {
    return false;
  }

  if (process.env.PROVISION_MODE === "simulate") {
    return true;
  }

  return !nextcloudAdminPassword();
}

export function appUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export function nextcloudBaseUrl() {
  return (process.env.NEXTCLOUD_URL || "https://files.acrossflare.com").replace(/\/$/, "");
}

/** Docker/OCS origin. Falls back to the public URL outside compose. */
export function nextcloudApiBaseUrl() {
  return (process.env.NEXTCLOUD_INTERNAL_URL || nextcloudBaseUrl()).replace(/\/$/, "");
}

export function nextcloudAdminUser() {
  return process.env.NEXTCLOUD_ADMIN_USER || "admin";
}

export function nextcloudAdminPassword() {
  return process.env.NEXTCLOUD_ADMIN_PASSWORD || "";
}

export function xuiApiToken() {
  return process.env.XUI_API_TOKEN || "";
}

export function xuiTlsInsecure() {
  return process.env.XUI_TLS_INSECURE === "1";
}
