const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const APP_VERSION = "web-1.0.0";

type Payload = {
  platform: "web";
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  appVersion: string;
  route: string;
  extra?: Record<string, unknown>;
};

let lastSent = "";
let lastSentAt = 0;

export function reportError(err: unknown, extra?: Record<string, unknown>): void {
  try {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;

    // Drop duplicate errors fired in quick succession (React often emits twice).
    const sig = `${message}:${stack?.slice(0, 100) ?? ""}`;
    const now = Date.now();
    if (sig === lastSent && now - lastSentAt < 5_000) return;
    lastSent = sig;
    lastSentAt = now;

    const payload: Payload = {
      platform: "web",
      message,
      stack,
      url: location.origin + location.pathname,
      userAgent: navigator.userAgent,
      appVersion: APP_VERSION,
      route: location.pathname,
      extra,
    };
    if (extra && typeof extra.componentStack === "string") {
      payload.componentStack = extra.componentStack;
    }

    fetch(`/ba7r-api/log/client-error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => { /* swallow */ });
  } catch {
    /* never let the reporter itself crash the app */
  }
}

export function installGlobalErrorHandlers(): void {
  window.addEventListener("error", (e) => {
    reportError(e.error ?? e.message, { kind: "window.onerror" });
  });
  window.addEventListener("unhandledrejection", (e) => {
    reportError(e.reason, { kind: "unhandledrejection" });
  });
}
