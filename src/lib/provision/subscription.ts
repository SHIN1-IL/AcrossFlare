import { backupDashboardUrl } from "@/lib/provision/config";

export const BACKUP_ANNOUNCE = "보안 백업 공간 바로가기";
export const KARING_REFRESH_ANNOUNCE =
  "트래픽 초과·노드 전환 후 Karing [서브스크립션 수동 업데이트]를 눌러 주세요.";

export function backupAnnounce(url = backupDashboardUrl()) {
  return `${BACKUP_ANNOUNCE} ${url}`;
}

export function withBackupNotice(yamlBody: string, options?: { refreshHint?: boolean }) {
  const url = backupDashboardUrl();
  const refreshHint = options?.refreshHint ?? false;
  if (yamlBody.includes("#profile-web-page-url:")) {
    const body = yamlBody.endsWith("\n") ? yamlBody : `${yamlBody}\n`;
    if (refreshHint && !body.includes(KARING_REFRESH_ANNOUNCE)) {
      return `#announce: ${KARING_REFRESH_ANNOUNCE}\n${body}`;
    }
    return body;
  }

  const notice = [
    `#profile-web-page-url: ${url}`,
    `#support-url: ${url}`,
    `#announce: ${backupAnnounce(url)}`,
    `# ${BACKUP_ANNOUNCE}: ${url}`,
    ...(refreshHint ? [`#announce: ${KARING_REFRESH_ANNOUNCE}`] : []),
  ].join("\n");

  return `${notice}\n${yamlBody.replace(/^\n+/, "")}`;
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
    announce: backupAnnounce(url),
    "announce-url": url,
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
