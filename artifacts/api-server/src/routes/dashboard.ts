import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { submissionsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

const router: IRouter = Router();

// Dashboard stats
router.get("/stats", async (_req, res) => {
  const [totalResult, byStatusResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(submissionsTable),
    db
      .select({
        status: submissionsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(submissionsTable)
      .groupBy(submissionsTable.status),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of byStatusResult) {
    byStatus[row.status] = row.count;
  }

  const recentResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissionsTable)
    .where(sql`created_at > now() - interval '7 days'`);

  res.json({
    total: totalResult[0]?.count ?? 0,
    byStatus,
    recentCount: recentResult[0]?.count ?? 0,
    awaitingReview: byStatus["awaiting_review"] ?? 0,
    published: byStatus["published"] ?? 0,
  });
});

// Recent submissions
router.get("/recent", async (_req, res) => {
  const recent = await db
    .select()
    .from(submissionsTable)
    .orderBy(desc(submissionsTable.createdAt))
    .limit(5);

  res.json(recent);
});

export default router;
