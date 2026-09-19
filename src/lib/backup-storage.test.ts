import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BackupStorageError,
  backupFolderPath,
  deleteBackupFile,
  listBackupFiles,
  openBackupFile,
  safeBackupName,
  storeBackupFile,
} from "@/lib/backup-storage";

let root = "";
const originalRoot = process.env.BACKUP_STORAGE_ROOT;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "acrossflare-backup-"));
  process.env.BACKUP_STORAGE_ROOT = root;
});

afterEach(async () => {
  if (originalRoot === undefined) {
    delete process.env.BACKUP_STORAGE_ROOT;
  } else {
    process.env.BACKUP_STORAGE_ROOT = originalRoot;
  }
  await rm(root, { recursive: true, force: true });
});

describe("backup storage", () => {
  it("rejects traversal, separators, and Syncthing control names", () => {
    for (const name of ["../secret", "folder/file", "folder\\file", ".stfolder", ".syncthing.tmp"]) {
      expect(() => safeBackupName(name)).toThrow(BackupStorageError);
    }
    expect(() => backupFolderPath("../../etc")).toThrow(BackupStorageError);
  });

  it("streams, lists, opens, overwrites, and deletes customer files", async () => {
    await store("hello.txt", "hello", 20);
    expect(await listBackupFiles("af-customer")).toMatchObject([
      { name: "hello.txt", size: 5 },
    ]);

    const opened = await openBackupFile("af-customer", "hello.txt");
    expect(await readFile(opened.handle, "utf8")).toBe("hello");
    await opened.handle.close();

    await store("hello.txt", "updated", 20);
    expect(await readFile(join(root, "af-customer", "hello.txt"), "utf8")).toBe("updated");

    await deleteBackupFile("af-customer", "hello.txt");
    expect(await listBackupFiles("af-customer")).toEqual([]);
  });

  it("enforces quota while streaming when content length is unavailable", async () => {
    await expect(store("large.txt", "123456", 5, null)).rejects.toMatchObject({
      code: "backup_quota_exceeded",
      status: 413,
    });
    expect(await listBackupFiles("af-customer")).toEqual([]);
  });

  it("does not follow symbolic links on download", async () => {
    const folder = backupFolderPath("af-customer");
    await store("safe.txt", "safe", 20);
    await symlink(join(root, "af-customer", "safe.txt"), join(folder, "linked.txt"));
    await expect(openBackupFile("af-customer", "linked.txt")).rejects.toMatchObject({
      code: "file_not_found",
    });
  });
});

async function store(
  name: string,
  contents: string,
  quotaBytes: number,
  contentLength: number | null = contents.length
) {
  const bytes = new TextEncoder().encode(contents);
  return storeBackupFile({
    folderId: "af-customer",
    name,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
    contentLength,
    quotaBytes,
  });
}
