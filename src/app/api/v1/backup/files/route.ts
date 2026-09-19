import { NextResponse } from "next/server";
import { assertSameOrigin, requireBackupAccess, updateBackupUsage } from "@/lib/backup-access";
import {
  BackupStorageError,
  backupUsageBytes,
  listBackupFiles,
  storeBackupFile,
} from "@/lib/backup-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await requireBackupAccess();
    const files = await listBackupFiles(access.folderId);
    const usedBytes = files.reduce((total, file) => total + file.size, 0);
    await updateBackupUsage(access.subscriptionId, usedBytes);
    return NextResponse.json(
      { files, usedBytes, quotaBytes: access.quotaBytes },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return backupErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const access = await requireBackupAccess();
    const name = new URL(request.url).searchParams.get("name") ?? "";
    if (!request.body) {
      throw new BackupStorageError("file_required", 400);
    }
    const rawLength = request.headers.get("content-length");
    const parsedLength = rawLength == null ? null : Number.parseInt(rawLength, 10);
    const contentLength =
      parsedLength != null && Number.isFinite(parsedLength) && parsedLength >= 0
        ? parsedLength
        : null;

    await storeBackupFile({
      folderId: access.folderId,
      name,
      body: request.body,
      contentLength,
      quotaBytes: access.quotaBytes,
    });
    const usedBytes = await backupUsageBytes(access.folderId);
    await updateBackupUsage(access.subscriptionId, usedBytes);
    return NextResponse.json(
      { ok: true, usedBytes, quotaBytes: access.quotaBytes },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return backupErrorResponse(error);
  }
}

function backupErrorResponse(error: unknown) {
  if (error instanceof BackupStorageError) {
    return NextResponse.json(
      { error: error.code },
      { status: error.status, headers: { "Cache-Control": "private, no-store" } }
    );
  }
  console.error("backup_files_failed", error);
  return NextResponse.json(
    { error: "backup_failed" },
    { status: 500, headers: { "Cache-Control": "private, no-store" } }
  );
}
