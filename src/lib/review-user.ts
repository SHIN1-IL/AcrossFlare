import { normalizeEmail } from "@/lib/email";

export const REVIEW_USER_EMAIL = "shin@acrosstool.com";
export const REVIEW_USER_PASSWORD = "12345678";

export function reviewUserEmail() {
  const raw = (process.env.REVIEW_USER_EMAIL ?? "").trim();
  return normalizeEmail(raw || REVIEW_USER_EMAIL);
}

export function reviewUserPassword() {
  const raw = (process.env.REVIEW_USER_PASSWORD ?? "").trim();
  return raw || REVIEW_USER_PASSWORD;
}

export function isReviewUserEmail(email: string | null | undefined) {
  return normalizeEmail(email ?? "") === reviewUserEmail();
}

export function canStartPublicCheckout(email: string | null | undefined) {
  return isReviewUserEmail(email);
}
