import { Router, type IRouter } from "express";
import healthRouter from "./health";
import submissionsRouter from "./submissions";
import dashboardRouter from "./dashboard";
import mediaRouter from "./media";
import aiRouter from "./ai";
import pdfRouter from "./pdf";
import authRouter from "./auth";
import creatomateRouter from "./creatomate";
import eoisRouter from "./eois";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use("/submissions", submissionsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/media", mediaRouter);
router.use(aiRouter);
router.use(pdfRouter);
router.use(creatomateRouter);
router.use("/eois", eoisRouter);

export default router;
