"use client";

import { Download, RefreshCw, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

type BackupFile = {
  name: string;
  size: number;
  updatedAt: string;
};

type FilesResponse = {
  files: BackupFile[];
  usedBytes: number;
  quotaBytes: number;
  error?: string;
};

export function BackupFiles() {
  const t = useTranslations("app");
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<FilesResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/backup/files", {
        credentials: "include",
        cache: "no-store",
      });
      const body = (await response.json()) as FilesResponse;
      if (!response.ok) {
        throw new Error(body.error || "backup_failed");
      }
      setData(body);
      setError("");
    } catch {
      setError(t("backupFilesLoadError"));
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/backup/files?name=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/octet-stream" },
          body: file,
        }
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "backup_failed");
      }
      await refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error && uploadError.message === "backup_quota_exceeded"
          ? t("backupQuotaError")
          : t("backupUploadError")
      );
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function remove(name: string) {
    if (!window.confirm(t("backupDeleteConfirm", { name }))) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/backup/files/${encodeURIComponent(name)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("delete_failed");
      }
      await refresh();
    } catch {
      setError(t("backupDeleteError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm">{t("filesTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("filesDesc")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={t("backupRefresh")}
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCw />
          </Button>
          <Button
            type="button"
            className="rounded-[10px]"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            {t("backupUpload")}
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void upload(file);
              }
            }}
          />
        </div>
      </div>

      {data ? (
        <p className="mt-4 text-xs text-muted-foreground">
          {t("backupStorageUsage", {
            used: formatBytes(data.usedBytes),
            total: formatBytes(data.quotaBytes),
          })}
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <div className="mt-4 divide-y divide-border rounded-xl border border-border">
        {data?.files.length ? (
          data.files.map((file) => (
            <div key={file.name} className="flex items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{file.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <a
                href={`/api/v1/backup/files/${encodeURIComponent(file.name)}`}
                aria-label={t("backupDownload", { name: file.name })}
                className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
              >
                <Download />
              </a>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t("backupDelete", { name: file.name })}
                disabled={busy}
                onClick={() => void remove(file.name)}
              >
                <Trash2 />
              </Button>
            </div>
          ))
        ) : (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {data ? t("backupFilesEmpty") : t("backupFilesLoading")}
          </p>
        )}
      </div>
    </article>
  );
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
