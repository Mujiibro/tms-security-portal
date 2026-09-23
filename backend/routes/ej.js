const express = require("express");
const { getPool } = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT * FROM dbo.ej_records ORDER BY start_date DESC");
    res.json(result.recordset);
  } catch (err) {
    console.error("[ej] error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
