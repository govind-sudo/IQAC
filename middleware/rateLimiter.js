// middleware/rateLimiter.js
//
// Minimal dependency-free in-memory rate limiter. Protects the two
// pre-submit AJAX endpoints (/register/validate-file,
// /register/verify-document) from abuse — each hit can spawn a fresh
// PaddleOCR process and/or call the Gemini API, so unbounded requests
// are both a cost risk and a DoS vector against the OCR subprocess pool.
//
// Not a substitute for a real store (Redis) in a multi-instance
// deployment, but sufficient for a single-process Node app and requires
// zero new dependencies.

function createRateLimiter({ windowMs, max, message }) {
  // ip -> { count, resetAt }
  const hits = new Map();

  // Periodic sweep so the map doesn't grow unbounded over a long-running
  // process life.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, Math.max(windowMs, 60_000)).unref();

  return function rateLimiter(req, res, next) {
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        valid: false,
        verified: false,
        reason: message || 'Too many requests — please slow down and try again shortly.',
      });
    }

    next();
  };
}

// Signature/format check is cheap — allow more of these.
const fileValidateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  message: 'Too many file checks — please wait a moment before trying again.',
});

// OCR + Gemini is expensive — allow fewer of these per minute.
const documentVerifyLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  message: 'Too many verification attempts — please wait a moment before trying again.',
});

// Final registration submit — generous but still bounded to blunt
// scripted registration-spam / duplicate-key hammering.
const registerSubmitLimiter = createRateLimiter({
  windowMs: 10 * 60_000,
  max: 20,
  message: 'Too many registration attempts from this connection. Please try again later.',
});

module.exports = {
  createRateLimiter,
  fileValidateLimiter,
  documentVerifyLimiter,
  registerSubmitLimiter,
};