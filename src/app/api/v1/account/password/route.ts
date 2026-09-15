import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword, isStrongPassword, verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { current?: string; next?: string }
    | null;
  const current = String(body?.current ?? "");
  const next = String(body?.next ?? "");

  if (!current || !next) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  if (!isStrongPassword(next)) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: auth.id } });
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });

  return NextResponse.json({ ok: true });
}
