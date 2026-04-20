import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { eoisTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// POST /api/eois — public EOI submission
router.post("/", async (req, res) => {
  try {
    const {
      buyerEmail, buyerFirstName, buyerSurname, buyerLocation, buyerPhone,
      horseName, formData, signatureData, waiverAgreed, declarationAgreed,
    } = req.body;

    if (!buyerEmail || !buyerFirstName || !buyerSurname || !buyerLocation || !buyerPhone || !horseName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [eoi] = await db.insert(eoisTable).values({
      buyerEmail,
      buyerFirstName,
      buyerSurname,
      buyerLocation,
      buyerPhone,
      horseName,
      formData: formData || {},
      signatureData: signatureData || null,
      waiverAgreed: waiverAgreed === true,
      declarationAgreed: declarationAgreed === true,
      status: "new",
    }).returning();

    res.json(eoi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit EOI" });
  }
});

// GET /api/eois — admin: list all EOIs
router.get("/", async (_req, res) => {
  try {
    const eois = await db.select().from(eoisTable).orderBy(desc(eoisTable.createdAt));
    res.json(eois);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch EOIs" });
  }
});

// GET /api/eois/:id — admin: get single EOI
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const [eoi] = await db.select().from(eoisTable).where(eq(eoisTable.id, id));
    if (!eoi) return res.status(404).json({ error: "Not found" });
    res.json(eoi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch EOI" });
  }
});

// PATCH /api/eois/:id — admin: update status / notes
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { status, adminNotes } = req.body;

    const [updated] = await db.update(eoisTable)
      .set({
        ...(status !== undefined && { status }),
        ...(adminNotes !== undefined && { adminNotes }),
        updatedAt: new Date(),
      })
      .where(eq(eoisTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update EOI" });
  }
});

export default router;
