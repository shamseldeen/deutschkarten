import { Router, type IRouter } from "express";
import healthRouter from "./health";
import flashcardsRouter from "./flashcards";
import meRouter from "./me";
import quizRouter from "./quiz";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(flashcardsRouter);
router.use(quizRouter);

export default router;
