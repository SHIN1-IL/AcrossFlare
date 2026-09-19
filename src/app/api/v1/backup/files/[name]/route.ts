import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { assertSameOrigin, requireBackupAccess, updateBackupUsage } from "@/lib/backup-access";
import {
  BackupStorageError,
  backupUsageBytes,
  deleteBackupFile,
  openBackupFile,
} from "@/lib/backup-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  let closeOnError: (() => Promise<void>) | undefined;
  try {
    const access = await requireBackupAccess();
    const { name } = await params;
    const opened = await openBackupFile(access.folderId, name);
    closeOnError = () => opened.handle.close();
    const stream = opened.handle.createReadStream({ autoClose: true });
    closeOnError = undefined;
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(opened.name)}`,
        "Content-Length": String(opened.size),
        "Content-Type": "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    await closeOnError?.().catch(() => undefined);
    return backupErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    assertSameOrigin(request);
    const access = await requireBackupAccess();
    const { name } = await params;
    await deleteBackupFile(access.folderId, name);
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
  console.error("backup_file_failed", error);
  return NextResponse.json(
    { error: "backup_failed" },
    { status: 500, headers: { "Cache-Control": "private, no-store" } }
  );
}
