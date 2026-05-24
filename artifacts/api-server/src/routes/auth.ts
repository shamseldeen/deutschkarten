import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { clerkClient } from "@clerk/express";
import { z } from "zod";

const router: IRouter = Router();

// Simple in-memory IP rate limiter: max 10 attempts / 60s per IP per path
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const _attempts = new Map<string, number[]>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const key = `${ip}:${req.path}`;
  const now = Date.now();
  const arr = (_attempts.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    res.status(429).json({ error: "Too many attempts. Try again in a minute." });
    return;
  }
  arr.push(now);
  _attempts.set(key, arr);
  // Opportunistic GC
  if (_attempts.size > 5000) {
    for (const [k, v] of _attempts) {
      if (v.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) _attempts.delete(k);
    }
  }
  next();
}

router.use("/auth", rateLimit);

const CredsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

const SignUpSchema = CredsSchema.extend({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
});

async function issueToken(userId: string) {
  const session = await clerkClient.sessions.createSession({ userId });
  const tokenResp = await clerkClient.sessions.getToken(session.id, "");
  return { sessionId: session.id, token: tokenResp.jwt };
}

router.post("/auth/sign-in", async (req, res) => {
  const parsed = CredsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password format" });
    return;
  }
  const { email, password } = parsed.data;
  try {
    const list = await clerkClient.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    const user = list.data?.[0];
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const verify = await clerkClient.users.verifyPassword({
      userId: user.id,
      password,
    });
    if (!verify?.verified) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const { token, sessionId } = await issueToken(user.id);
    res.json({
      token,
      sessionId,
      userId: user.id,
      email: user.emailAddresses?.[0]?.emailAddress ?? email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
    });
  } catch (err) {
    req.log?.warn({ err }, "sign-in failed");
    res.status(401).json({ error: "Invalid email or password" });
  }
});

router.post("/auth/sign-up", async (req, res) => {
  const parsed = SignUpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Email + 8-char password required",
    });
    return;
  }
  const { email, password, firstName, lastName } = parsed.data;
  try {
    const user = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName,
      skipPasswordChecks: false,
    });
    const { token, sessionId } = await issueToken(user.id);
    res.json({
      token,
      sessionId,
      userId: user.id,
      email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
    });
  } catch (err: unknown) {
    const e = err as { errors?: Array<{ message?: string; longMessage?: string }> };
    const msg =
      e?.errors?.[0]?.longMessage ||
      e?.errors?.[0]?.message ||
      "Sign-up failed";
    req.log?.warn({ err }, "sign-up failed");
    res.status(400).json({ error: msg });
  }
});

export default router;
