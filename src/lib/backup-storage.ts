import { constants, createWriteStream } from "node:fs";
import { mkdir, open, readdir, rename, rm, stat } from "node:fs/promises";
import { basename, join, resolve, sep } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { backupStorageRoot } from "@/lib/provision/config";

export const MAX_BACKUP_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_BACKUP_FILES = 1_000;

const folderLocks = new Map<string, Promise<void>>();

export type BackupFile = {
  name: string;
  size: number;
  updatedAt: string;
};

export class BackupStorageError extends Error {
  constructor(
    public code: string,
    public status: number
  ) {
    super(code);
    this.name = "BackupStorageError";
  }
}

export function safeBackupName(input: string) {
  const name = input.normalize("NFC").trim();
  if (
    !name ||
    name.length > 180 ||
    name !== basename(name) ||
    name === "." ||
    name === ".." ||
    name.startsWith(".syncthing.") ||
    name === ".stfolder" ||
    /[/\\\0-\x1f\x7f]/.test(name)
  ) {
    throw new BackupStorageError("file_name_invalid", 400);
  }
  return name;
}

export function backupFolderPath(folderId: string) {
  if (!/^af-[a-z0-9]{1,64}$/.test(folderId)) {
    throw new BackupStorageError("backup_folder_invalid", 500);
  }
  const root = resolve(backupStorageRoot());
  const folder = resolve(root, folderId);
  if (!folder.startsWith(`${root}${sep}`)) {
    throw new BackupStorageError("backup_folder_invalid", 500);
  }
  return folder;
}

export async function listBackupFiles(folderId: string): Promise<BackupFile[]> {
  const folder = backupFolderPath(folderId);
  await mkdir(folder, { recursive: true });
  const entries = await readdir(folder, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && !entry.name.startsWith(".upload-"))
      .map(async (entry) => {
        const info = await stat(join(folder, entry.name));
        return {
          name: entry.name,
          size: info.size,
          updatedAt: info.mtime.toISOString(),
        };
      })
  );
  return files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function backupUsageBytes(folderId: string) {
  const files = await listBackupFiles(folderId);
  return files.reduce((total, file) => total + file.size, 0);
}

export async function storeBackupFile(input: {
  folderId: string;
  name: string;
  body: ReadableStream<Uint8Array>;
  contentLength: number | null;
  quotaBytes: number;
}) {
  return withFolderLock(input.folderId, async () => {
    const name = safeBackupName(input.name);
    const folder = backupFolderPath(input.folderId);
    await mkdir(folder, { recursive: true });
    const files = await listBackupFiles(input.folderId);
    const existing = files.find((file) => file.name === name);
    if (!existing && files.length >= MAX_BACKUP_FILES) {
      throw new BackupStorageError("file_count_exceeded", 413);
    }

    const available = Math.min(
      MAX_BACKUP_FILE_BYTES,
      input.quotaBytes - files.reduce((total, file) => total + file.size, 0) + (existing?.size ?? 0)
    );
    if (available < 0 || (input.contentLength != null && input.contentLength > available)) {
      throw new BackupStorageError("backup_quota_exceeded", 413);
    }

    const target = join(folder, name);
    const temporary = join(folder, `.upload-${crypto.randomUUID()}`);
    let written = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        written += chunk.length;
        if (written > available) {
          callback(new BackupStorageError("backup_quota_exceeded", 413));
          return;
        }
        callback(null, chunk);
      },
    });

    try {
      await pipeline(
        Readable.fromWeb(input.body as never),
        limiter,
        createWriteStream(temporary, { flags: "wx", mode: 0o600 })
      );
      await rename(temporary, target);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }

    return { name, size: written };
  });
}

export async function openBackupFile(folderId: string, rawName: string) {
  const name = safeBackupName(rawName);
  const path = join(backupFolderPath(folderId), name);
  try {
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const info = await handle.stat();
    if (!info.isFile()) {
      await handle.close();
      throw new BackupStorageError("file_not_found", 404);
    }
    return { handle, name, size: info.size };
  } catch (error) {
    if (error instanceof BackupStorageError) {
      throw error;
    }
    throw new BackupStorageError("file_not_found", 404);
  }
}

export async function deleteBackupFile(folderId: string, rawName: string) {
  return withFolderLock(folderId, async () => {
    const opened = await openBackupFile(folderId, rawName);
    await opened.handle.close();
    await rm(join(backupFolderPath(folderId), opened.name));
  });
}

async function withFolderLock<T>(folderId: string, operation: () => Promise<T>): Promise<T> {
  const previous = folderLocks.get(folderId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolveLock) => {
    release = resolveLock;
  });
  const queued = previous.then(() => current);
  folderLocks.set(folderId, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (folderLocks.get(folderId) === queued) {
      folderLocks.delete(folderId);
    }
  }
}
