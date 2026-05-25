import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.userId = userId;

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (existing.length === 0) {
      try {
        const u = await clerkClient.users.getUser(userId);
        const email = u.emailAddresses?.[0]?.emailAddress ?? null;
        const displayName =
          [u.firstName, u.lastName].filter(Boolean).join(" ") ||
          u.username ||
          email ||
          "User";
        await db
          .insert(usersTable)
          .values({
            id: userId,
            email,
            displayName,
            imageUrl: u.imageUrl ?? null,
          })
          .onConflictDoNothing();
      } catch {
        await db
          .insert(usersTable)
          .values({ id: userId, displayName: "User" })
          .onConflictDoNothing();
      }
    }
    next();
  } catch (err) {
    req.log?.error({ err }, "requireAuth failed");
    res.status(500).json({ error: "Auth check failed" });
  }
}
