export type UserRole = "USER" | "ADMIN";

export type PublicSession = {
  email: string;
  role: UserRole;
};

export function isAdminSession(session: PublicSession | null | undefined) {
  return session?.role === "ADMIN";
}
