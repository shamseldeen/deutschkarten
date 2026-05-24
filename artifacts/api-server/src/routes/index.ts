import { Router, type IRouter } from "express";
import healthRouter from "./health";
import flashcardsRouter from "./flashcards";
import meRouter from "./me";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(flashcardsRouter);

export default router;
