// config/redisClient.js
//
// Single shared ioredis connection, used for:
//   1. OCR result caching (utils/ocrTextExtractor.js) — keyed by file
//      hash, so the SAME uploaded document is never OCR'd twice (once
//      during the pre-submit AJAX check, once again at final submit).
//   2. BullMQ's backing store for the OCR job queue (queue/ocrQueue.js).
//
// REDIS_URL defaults to localhost — set it explicitly in .env for any
// real deployment.

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// BullMQ requires this exact option on any connection it manages.
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

module.exports = connection;