import { spawn } from "node:child_process";

const user = process.env.POSTGRES_USER || "acrossflare";
const password = process.env.POSTGRES_PASSWORD || "acrossflare";
const db = process.env.POSTGRES_DB || "acrossflare";
const host = process.env.POSTGRES_HOST || "postgres";
const port = process.env.POSTGRES_PORT || "5432";

process.env.DATABASE_URL = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(db)}`;

const child = spawn("./node_modules/.bin/prisma", ["migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
