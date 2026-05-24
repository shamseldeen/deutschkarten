import { Router, type IRouter } from "express";
import { db, userSettingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq } from "drizzle-orm";
import { isSupportedLang } from "../lib/languages";

const router: IRouter = Router();

router.get("/me/settings", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const [s] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);
  res.json(s ?? { userId, primaryLang: "en", secondaryLang: "ar" });
});

router.patch("/me/settings", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { primaryLang, secondaryLang } = req.body ?? {};

  if (primaryLang !== undefined) {
    if (typeof primaryLang !== "string" || !isSupportedLang(primaryLang)) {
      res.status(400).json({ error: "Unsupported primary language" });
      return;
    }
  }
  if (secondaryLang !== undefined && secondaryLang !== null) {
    if (typeof secondaryLang !== "string" || (secondaryLang !== "none" && !isSupportedLang(secondaryLang))) {
      res.status(400).json({ error: "Unsupported secondary language" });
      return;
    }
  }

  const sec = secondaryLang === "none" ? null : secondaryLang ?? null;

  await db
    .insert(userSettingsTable)
    .values({
      userId,
      primaryLang: primaryLang ?? "en",
      secondaryLang: sec,
    })
    .onConflictDoUpdate({
      target: userSettingsTable.userId,
      set: {
        ...(primaryLang ? { primaryLang } : {}),
        ...(secondaryLang !== undefined ? { secondaryLang: sec } : {}),
        updatedAt: new Date(),
      },
    });

  const [s] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);
  res.json(s);
});

export default router;
