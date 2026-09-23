/**
 * Simple in-memory sliding-window rate limiter for the login endpoint.
 * For a multi-instance/production deployment, back this with Redis instead
 * of an in-memory Map.
 */
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 10; // per IP per window

const hits = new Map(); // ip -> [timestamps]

function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();
  const timestamps = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  hits.set(ip, timestamps);

  if (timestamps.length > MAX_ATTEMPTS) {
    return res.status(429).json({ error: "Too many requests. Try again shortly." });
  }
  next();
}

module.exports = { loginRateLimiter };
