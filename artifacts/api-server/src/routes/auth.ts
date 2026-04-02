import { Router, type IRouter } from "express";
import { createHmac } from "crypto";

const router: IRouter = Router();

function makeToken(password: string): string {
  const secret = process.env.SESSION_SECRET ?? "phs-fallback-secret";
  return createHmac("sha256", secret).update(password).digest("hex");
}

router.post("/admin/login", (req, res) => {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(503).json({ error: "Admin password not configured. Set the ADMIN_PASSWORD secret." });
  }

  const { password } = req.body as { password?: string };

  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  const token = makeToken(adminPassword);
  res.json({ token });
});

export default router;
