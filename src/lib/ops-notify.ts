import { ownerEmail } from "@/lib/admin-permissions";

export type OpsNotifyResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "send_failed" };

function resendApiKey() {
  return (process.env.RESEND_API_KEY ?? "").trim();
}

function opsNotifyFrom() {
  const raw = (process.env.OPS_NOTIFY_FROM ?? "").trim();
  return raw || "AcrossFlare <ops@acrossflare.com>";
}

export async function sendOpsEmail(subject: string, text: string): Promise<OpsNotifyResult> {
  const apiKey = resendApiKey();
  if (!apiKey) {
    console.info("ops_notify_skipped", { subject, reason: "not_configured" });
    return { ok: false, reason: "not_configured" };
  }

  const to = ownerEmail();
  if (!to) {
    console.info("ops_notify_skipped", { subject, reason: "not_configured" });
    return { ok: false, reason: "not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: opsNotifyFrom(),
        to: [to],
        subject,
        text,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("ops_notify_send_failed", response.status, body.slice(0, 300));
      return { ok: false, reason: "send_failed" };
    }

    return { ok: true };
  } catch (error) {
    console.error("ops_notify_send_failed", error);
    return { ok: false, reason: "send_failed" };
  }
}

export function notifyOpsSignup(email: string) {
  const at = new Date().toISOString();
  return sendOpsEmail(
    `[AcrossFlare] 신규 가입: ${email}`,
    [`신규 회원가입이 있습니다.`, ``, `이메일: ${email}`, `시각: ${at}`, ``].join("\n")
  );
}

export function notifyOpsPayment(input: {
  email: string;
  planId: string;
  amount: number;
  currency: string;
}) {
  const at = new Date().toISOString();
  return sendOpsEmail(
    `[AcrossFlare] 결제 완료: ${input.email}`,
    [
      `결제가 완료되었습니다.`,
      ``,
      `이메일: ${input.email}`,
      `플랜: ${input.planId}`,
      `금액: ${input.amount} ${input.currency}`,
      `시각: ${at}`,
      ``,
    ].join("\n")
  );
}
