import { NextResponse } from "next/server";
import { ownerEmail } from "@/lib/admin-permissions";
import { ownerPassword } from "@/lib/bootstrap-logins";
import { reviewUserEmail, reviewUserPassword } from "@/lib/review-user";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      reviewEmail: reviewUserEmail(),
      reviewPassword: reviewUserPassword(),
      ownerEmail: ownerEmail(),
      ownerPassword: ownerPassword(),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
