import { normalizeEmail } from "@/lib/email";

export const REVIEW_USER_EMAIL = "shin@acrosstool.com";
export const REVIEW_USER_PASSWORD = "12345678";

export function isReviewUserEmail(email: string | null | undefined) {
  return normalizeEmail(email ?? "") === normalizeEmail(REVIEW_USER_EMAIL);
}

export function canStartPublicCheckout(email: string | null | undefined) {
  return isReviewUserEmail(email);
}
