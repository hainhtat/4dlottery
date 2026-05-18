export type AppRole = "admin" | "agent";

export function getRoleFromUser(user: { app_metadata?: Record<string, unknown> } | null): AppRole | null {
  const role = user?.app_metadata?.role;
  if (role === "admin" || role === "agent") return role;
  return null;
}
