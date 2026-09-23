/**
 * mlClient.js — talks to the Python ML anomaly-detection microservice.
 *
 * Fails safe: if the ML service is down, login flow continues normally
 * (score = null, is_anomaly = false) rather than blocking authentication.
 */
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

async function scoreLoginEvent({ username, ip, success, hourOfDay }) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, ip, success, hour_of_day: hourOfDay }),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`ML service returned ${res.status}`);
    return await res.json(); // { anomaly_score, is_anomaly }
  } catch (err) {
    console.warn("[mlClient] ML service unavailable, skipping scoring:", err.message);
    return { anomaly_score: null, is_anomaly: false };
  }
}

module.exports = { scoreLoginEvent };
