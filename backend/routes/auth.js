const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getPool, sql } = require("../config/db");
const logger = require("../services/securityLogger");
const { scoreLoginEvent } = require("../services/mlClient");
const { loginRateLimiter } = require("../middleware/rateLimiter");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

router.post("/login", loginRateLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  const ip = req.ip || req.connection.remoteAddress || "unknown";

  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  try {
    const pool = await getPool();

    const userResult = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .query("SELECT * FROM dbo.users WHERE username = @username");
    const user = userResult.recordset[0];

    // Account lockout check
    if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
      logger.loginFailed(username, ip, "Attempt on locked account");
      return res.status(423).json({ error: "Account temporarily locked. Try again later." });
    }

    const valid = user && bcrypt.compareSync(password, user.password_hash);
    const hourOfDay = new Date().getHours();

    // Score this login attempt via the ML anomaly-detection service
    const { anomaly_score, is_anomaly } = await scoreLoginEvent({
      username,
      ip,
      success: valid ? 1 : 0,
      hourOfDay,
    });

    await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("ip", sql.NVarChar, ip)
      .input("success", sql.Bit, valid ? 1 : 0)
      .input("hour", sql.Int, hourOfDay)
      .input("score", sql.Float, anomaly_score)
      .input("isAnomaly", sql.Bit, is_anomaly ? 1 : 0)
      .query(
        `INSERT INTO dbo.login_events (username, ip_address, success, hour_of_day, anomaly_score, is_anomaly)
         VALUES (@username, @ip, @success, @hour, @score, @isAnomaly)`
      );

    if (is_anomaly) {
      logger.anomalyDetected(
        username,
        ip,
        anomaly_score,
        valid ? "Unusual pattern on successful login" : "Unusual pattern on failed login"
      );
    }

    if (!valid) {
      logger.loginFailed(username, ip);

      if (user) {
        const attempts = user.failed_attempts + 1;
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
          await pool
            .request()
            .input("id", sql.Int, user.id)
            .input("attempts", sql.Int, attempts)
            .input("lockedUntil", sql.DateTime2, lockedUntil)
            .query("UPDATE dbo.users SET failed_attempts = @attempts, locked_until = @lockedUntil WHERE id = @id");
          logger.accountLocked(username, ip);
        } else {
          await pool
            .request()
            .input("id", sql.Int, user.id)
            .input("attempts", sql.Int, attempts)
            .query("UPDATE dbo.users SET failed_attempts = @attempts WHERE id = @id");
        }
      }
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Successful login — reset failure counter
    await pool
      .request()
      .input("id", sql.Int, user.id)
      .query("UPDATE dbo.users SET failed_attempts = 0, locked_until = NULL WHERE id = @id");
    logger.loginSuccess(username, ip);

    const token = jwt.sign({ sub: user.id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: "8h",
    });

    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (err) {
    console.error("[auth] login error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
