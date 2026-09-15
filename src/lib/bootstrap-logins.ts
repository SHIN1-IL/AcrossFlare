import { Role } from "@prisma/client";
import { ownerEmail } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { reviewUserEmail, reviewUserPassword } from "@/lib/review-user";

export function ownerPassword() {
  return (process.env.ADMIN_OWNER_PASSWORD ?? "").trim();
}

export async function applyEnvLoginPassword(email: string, password: string) {
  const owner = ownerEmail();
  const envOwnerPassword = ownerPassword();
  if (email === owner && envOwnerPassword && password === envOwnerPassword) {
    await upsertLogin(email, password, Role.OWNER);
    return;
  }

  if (email === reviewUserEmail() && password === reviewUserPassword()) {
    await upsertLogin(email, password, Role.USER);
  }
}

async function upsertLogin(email: string, password: string, role: Role) {
  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, role },
    update: { passwordHash, role },
  });
}
