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
import driveRouter from "./drive";
import horseSearchesRouter from "./horse-searches";
import contractsRouter from "./contracts";
import { sendInternalAlertEmail } from "../lib/email.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

// Temporary test route — remove after email is confirmed working
router.post("/test-email", async (_req, res) => {
  try {
    await sendInternalAlertEmail({
      formType: "seller",
      recordId: 0,
      name: "Test Submission",
      email: "test@example.com",
      horseName: "Test Horse",
    });
    res.json({ ok: true, message: "Test email sent — check phs.au.nz@gmail.com" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? "Unknown error" });
  }
});
router.use("/submissions", submissionsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/media", mediaRouter);
router.use(aiRouter);
router.use(pdfRouter);
router.use(creatomateRouter);
router.use("/eois", eoisRouter);
router.use("/drive", driveRouter);
router.use("/horse-searches", horseSearchesRouter);
router.use(contractsRouter);

export default router;
