import { Router, type IRouter } from "express";
import healthRouter from "./health";
import submissionsRouter from "./submissions";
import dashboardRouter from "./dashboard";
import mediaRouter from "./media";
import aiRouter from "./ai";
import pdfRouter from "./pdf";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/submissions", submissionsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/media", mediaRouter);
router.use(aiRouter);
router.use(pdfRouter);

export default router;
