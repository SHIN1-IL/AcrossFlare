export function isProvisionSimulate() {
  if (process.env.PROVISION_MODE === "live") {
    return false;
  }

  if (process.env.PROVISION_MODE === "simulate") {
    return true;
  }

  return !xuiApiToken();
}

export function appUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export function backupDashboardUrl() {
  return (process.env.BACKUP_DASHBOARD_URL || "https://acrossflare.com/dashboard").replace(/\/$/, "");
}

export function vaultwardenBaseUrl() {
  return (process.env.VAULTWARDEN_URL || "https://vault.acrossflare.com").replace(/\/$/, "");
}

export function vaultwardenApiBaseUrl() {
  return (process.env.VAULTWARDEN_INTERNAL_URL || vaultwardenBaseUrl()).replace(/\/$/, "");
}

export function vaultwardenAdminToken() {
  return process.env.VAULTWARDEN_ADMIN_TOKEN || "";
}

export function syncthingBaseUrl() {
  return (process.env.SYNCTHING_URL || "https://sync.acrossflare.com").replace(/\/$/, "");
}

export function syncthingApiBaseUrl() {
  return (process.env.SYNCTHING_INTERNAL_URL || syncthingBaseUrl()).replace(/\/$/, "");
}

export function syncthingApiKey() {
  return process.env.SYNCTHING_API_KEY || "";
}

export function xuiApiToken() {
  return process.env.XUI_API_TOKEN || "";
}

export function xuiTlsInsecure() {
  return process.env.XUI_TLS_INSECURE === "1";
}
