import { backupDashboardUrl } from "@/lib/provision/config";

export const BACKUP_ANNOUNCE = "보안 백업 공간 바로가기";

export function withBackupNotice(yamlBody: string) {
  const url = backupDashboardUrl();
  const notice = `# ${BACKUP_ANNOUNCE}: ${url}\n`;
  if (yamlBody.includes(url)) {
    return yamlBody.endsWith("\n") ? yamlBody : `${yamlBody}\n`;
  }
  return `${notice}${yamlBody.replace(/^\n+/, "")}`;
}

export function karingSubscriptionHeaders(input?: {
  trafficUsedGb?: number;
  trafficLimitGb?: number | null;
  expiresAt?: Date | string | null;
}) {
  const url = backupDashboardUrl();
  const used = input?.trafficUsedGb ?? 0;
  const limit = input?.trafficLimitGb;
  const expire = expireUnix(input?.expiresAt);
  const download = Math.round(used * 1024 * 1024 * 1024);
  const total = limit == null ? 0 : Math.round(limit * 1024 * 1024 * 1024);

  return {
    "Content-Type": "text/yaml; charset=utf-8",
    "Cache-Control": "private, no-store",
    "profile-title": "AcrossFlare",
    "profile-update-interval": "24",
    "profile-web-page-url": url,
    "support-url": url,
    announce: BACKUP_ANNOUNCE,
    "subscription-userinfo": `upload=0; download=${download}; total=${total}; expire=${expire}`,
  };
}

function expireUnix(value?: Date | string | null) {
  if (!value) {
    return 0;
  }
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? Math.floor(time / 1000) : 0;
}
