const express = require("express");
const { getPool } = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/events", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT TOP 200 * FROM dbo.login_events ORDER BY created_at DESC");
    res.json(result.recordset);
  } catch (err) {
    console.error("[anomaly] error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/flagged", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query("SELECT TOP 200 * FROM dbo.login_events WHERE is_anomaly = 1 ORDER BY created_at DESC");
    res.json(result.recordset);
  } catch (err) {
    console.error("[anomaly] error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const total = await pool.request().query("SELECT COUNT(*) AS c FROM dbo.login_events");
    const flagged = await pool.request().query("SELECT COUNT(*) AS c FROM dbo.login_events WHERE is_anomaly = 1");
    const failed = await pool.request().query("SELECT COUNT(*) AS c FROM dbo.login_events WHERE success = 0");
    res.json({
      total_events: total.recordset[0].c,
      flagged_anomalies: flagged.recordset[0].c,
      failed_logins: failed.recordset[0].c,
    });
  } catch (err) {
    console.error("[anomaly] error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
