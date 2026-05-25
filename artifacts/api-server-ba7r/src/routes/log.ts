import { Router, type IRouter, type Request } from "express";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

// Bounded per-IP rate limit so a buggy or malicious client can't flood logs
// or grow the limiter map without bound.
const LIMIT_PER_MIN = 60;
const MAX_TRACKED_IPS = 10_000;
const GLOBAL_LIMIT_PER_MIN = 5_000; // hard cap across all clients

const limits = new Map<string, { count: number; resetAt: number }>();
let globalSlot = { count: 0, resetAt: 0 };

// Trust only req.ip (resolved by Express via `trust proxy`), never raw
// client-supplied `x-forwarded-for`.
function clientIp(req: Request): string {
  return req.ip ?? "unknown";
}

function stripQuery(u: unknown): string | undefined {
  if (typeof u !== "string") return undefined;
  const trimmed = u.split("?")[0]!.split("#")[0]!;
  return trimmed.slice(0, 500);
}

router.post("/log/client-error", (req, res) => {
  const now = Date.now();

  // Global cap first — protects us even if per-IP keys explode.
  if (now > globalSlot.resetAt)
    globalSlot = { count: 0, resetAt: now + 60_000 };
  globalSlot.count += 1;
  if (globalSlot.count > GLOBAL_LIMIT_PER_MIN) {
    res.status(429).json({ error: "Server log capacity reached" });
    return;
  }

  // Bound the map: if it gets too big, drop expired slots; if still full, refuse.
  if (limits.size >= MAX_TRACKED_IPS) {
    for (const [k, v] of limits) if (v.resetAt < now) limits.delete(k);
    if (limits.size >= MAX_TRACKED_IPS) {
      res.status(429).json({ error: "Server log capacity reached" });
      return;
    }
  }

  const ip = clientIp(req);
  const slot = limits.get(ip);
  if (!slot || now > slot.resetAt) {
    limits.set(ip, { count: 1, resetAt: now + 60_000 });
  } else {
    slot.count += 1;
    if (slot.count > LIMIT_PER_MIN) {
      res.status(429).json({ error: "Too many error reports" });
      return;
    }
  }

  const body = req.body ?? {};
  const userId = getAuth(req)?.userId ?? null;

  req.log.error(
    {
      clientError: true,
      platform:
        typeof body.platform === "string"
          ? body.platform.slice(0, 50)
          : "unknown",
      url: stripQuery(body.url),
      userAgent:
        typeof body.userAgent === "string"
          ? body.userAgent.slice(0, 300)
          : undefined,
      appVersion:
        typeof body.appVersion === "string"
          ? body.appVersion.slice(0, 50)
          : undefined,
      route:
        typeof body.route === "string" ? body.route.slice(0, 200) : undefined,
      userId,
      message:
        typeof body.message === "string"
          ? body.message.slice(0, 1000)
          : "unknown",
      stack:
        typeof body.stack === "string" ? body.stack.slice(0, 4000) : undefined,
      componentStack:
        typeof body.componentStack === "string"
          ? body.componentStack.slice(0, 2000)
          : undefined,
    },
    "client error reported",
  );

  res.status(204).end();
});

export default router;
