import { Router, type IRouter } from "express";
import healthRouter from "./health";
import flashcardsRouter from "./flashcards";
import meRouter from "./me";
import quizRouter from "./quiz";
import authRouter from "./auth";
import leaderboardRouter from "./leaderboard";
import settingsRouter from "./settings";
import communityRouter from "./community";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(flashcardsRouter);
router.use(quizRouter);
router.use(leaderboardRouter);
router.use(settingsRouter);
router.use(communityRouter);

export default router;
