import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { errorHandler } from "./middlewares/errorHandler";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check before any auth middleware so it never hangs
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", v: "2026-05-27-ws-fix" });
});

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

const frontendDist = new URL("../../flashcards/dist/public", import.meta.url)
  .pathname;
app.use("/flashcards", express.static(frontendDist));
app.get("/flashcards/*splat", (_req, res) => {
  res.sendFile("index.html", { root: frontendDist });
});

app.use(errorHandler);

export default app;
