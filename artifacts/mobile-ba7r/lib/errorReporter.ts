import { Platform } from "react-native";
import { apiFetch } from "./api";

const APP_VERSION = "mobile-1.0.0";

let lastSent = "";
let lastSentAt = 0;

export function reportError(
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  try {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;

    const sig = `${message}:${stack?.slice(0, 100) ?? ""}`;
    const now = Date.now();
    if (sig === lastSent && now - lastSentAt < 5_000) return;
    lastSent = sig;
    lastSentAt = now;

    void apiFetch("/ba7r-api/log/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: `mobile-${Platform.OS}`,
        message,
        stack,
        appVersion: APP_VERSION,
        extra,
      }),
    }).catch(() => {
      /* swallow */
    });
  } catch {
    /* never let the reporter itself crash the app */
  }
}

let installed = false;
export function installGlobalErrorHandlers(): void {
  if (installed) return;
  installed = true;
  // React Native exposes ErrorUtils on the global scope (typed via any).
  const g = globalThis as unknown as {
    ErrorUtils?: {
      getGlobalHandler: () => (err: Error, isFatal?: boolean) => void;
      setGlobalHandler: (h: (err: Error, isFatal?: boolean) => void) => void;
    };
  };
  const existing = g.ErrorUtils?.getGlobalHandler();
  g.ErrorUtils?.setGlobalHandler((err, isFatal) => {
    reportError(err, { isFatal: !!isFatal });
    existing?.(err, isFatal);
  });
}
