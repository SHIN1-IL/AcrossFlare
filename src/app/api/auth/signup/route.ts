import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createSession, materializeAuthUser, setSessionCookie } from "@/lib/auth";
import { toPublicSession } from "@/lib/auth-types";
import { isOwnerEmail } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";
import { hashPassword, isStrongPassword } from "@/lib/password";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;
  const email = normalizeEmail(body?.email ?? "");
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  if (!isStrongPassword(password)) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  if (!isOwnerEmail(email)) {
    return NextResponse.json({ error: "review_only" }, { status: 403 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        role: isOwnerEmail(email) ? "OWNER" : "USER",
      },
    });

    const token = await createSession(user.id);
    await setSessionCookie(token);
    const session = await materializeAuthUser(user);

    return NextResponse.json({
      user: toPublicSession(session),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }

    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
