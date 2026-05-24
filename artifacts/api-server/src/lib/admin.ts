// Admin authorization via env var ADMIN_USER_IDS (comma-separated Clerk user IDs).
// Keeping admins in env (not DB) avoids the need for a role table and an
// admin-management UI for a small project. Add/remove via Replit Secrets.

let cached: Set<string> | null = null;

export function getAdminIds(): Set<string> {
  if (cached) return cached;
  const raw = process.env["ADMIN_USER_IDS"] ?? "";
  cached = new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return cached;
}

export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return getAdminIds().has(userId);
}
