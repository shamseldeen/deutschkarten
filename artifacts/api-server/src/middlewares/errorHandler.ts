import type { ErrorRequestHandler } from "express";
import { logger } from "../lib/logger";

// Catches synchronous + awaited-rejection errors in any route and logs them
// with structured context, then returns a generic 500 to the client.
// In Express 5, thrown errors inside async route handlers are forwarded
// here automatically.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const log = req.log ?? logger;
  log.error(
    {
      err,
      method: req.method,
      path: req.path,
      userId: (req as { userId?: string }).userId ?? null,
    },
    "unhandled route error",
  );
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
};

// Final safety net for anything that escapes the request lifecycle entirely.
export function installProcessHandlers() {
  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "unhandledRejection");
  });
  process.on("uncaughtException", (err) => {
    logger.error({ err }, "uncaughtException");
  });
}
