import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const user = process.env.POSTGRES_USER || "acrossflare";
const password = process.env.POSTGRES_PASSWORD || "acrossflare";
const db = process.env.POSTGRES_DB || "acrossflare";
const host = process.env.POSTGRES_HOST || "postgres";
const port = process.env.POSTGRES_PORT || "5432";

process.env.DATABASE_URL = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(db)}`;

const tsx = path.join(appRoot, "node_modules", ".bin", "tsx");
const seed = path.join(appRoot, "prisma", "seed.ts");

const child = spawn(tsx, [seed], {
  stdio: "inherit",
  env: process.env,
  cwd: appRoot,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
