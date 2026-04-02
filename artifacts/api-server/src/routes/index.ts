import { Router, type IRouter } from "express";
import healthRouter from "./health";
import submissionsRouter from "./submissions";
import dashboardRouter from "./dashboard";
import mediaRouter from "./media";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/submissions", submissionsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/media", mediaRouter);
router.use(aiRouter);

export default router;
