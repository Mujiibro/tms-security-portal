/**
 * securityLogger.js
 *
 * Writes audit/security events to a flat log file in the exact format your
 * existing Wazuh setup already parses:
 *   <ISO timestamp> - <EventType> - User: <user> - IP: <ip> - <detail>
 *
 * Wazuh agent (ossec.conf) tails this file; local_rules.xml matches on
 * EventType strings. New event types just need a matching <regex> added to
 * wazuh/local_rules.xml (see that file for Anomaly_Detected as an example).
 */
const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "tms_security.log");

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function writeLog(eventType, { user = "unknown", ip = "unknown", detail = "" } = {}) {
  const line = `${new Date().toISOString()} - ${eventType} - User: ${user} - IP: ${ip} - ${detail}\n`;
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) console.error("[securityLogger] failed to write log:", err.message);
  });
  // Also echo to console so it's visible during local dev
  console.log(`[SECURITY] ${line.trim()}`);
}

module.exports = {
  loginFailed: (user, ip, detail = "Invalid username or password attempted") =>
    writeLog("Login_Failed", { user, ip, detail }),

  loginSuccess: (user, ip) =>
    writeLog("Login_Success", { user, ip, detail: "Authenticated successfully" }),

  accountLocked: (user, ip, detail = "Account locked after repeated failed attempts") =>
    writeLog("Account_Locked", { user, ip, detail }),

  anomalyDetected: (user, ip, score, detail = "") =>
    writeLog("Anomaly_Detected", { user, ip, detail: `Score: ${score.toFixed(3)} - ${detail}` }),

  raw: writeLog,
};
