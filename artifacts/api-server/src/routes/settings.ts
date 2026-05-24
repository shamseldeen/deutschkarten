import { Router, type IRouter } from "express";
import { db, userSettingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq } from "drizzle-orm";
import { isSupportedLang } from "../lib/languages";
import { z } from "zod/v4";

const router: IRouter = Router();

const SecondaryLang = z
  .union([z.string(), z.null(), z.literal("none")])
  .refine(
    (v) => v === null || v === "none" || (typeof v === "string" && isSupportedLang(v)),
    { message: "Unsupported secondary language" },
  );

const PatchSettingsBody = z.object({
  primaryLang: z
    .string()
    .refine(isSupportedLang, { message: "Unsupported primary language" })
    .optional(),
  secondaryLang: SecondaryLang.optional(),
});

router.get("/me/settings", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const [s] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);
  res.json(s ?? { userId, primaryLang: "en", secondaryLang: "ar" });
});

router.patch("/me/settings", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const parsed = PatchSettingsBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    return;
  }
  const { primaryLang, secondaryLang } = parsed.data;
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
