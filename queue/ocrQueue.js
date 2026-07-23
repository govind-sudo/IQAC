// queue/ocrQueue.js
//
// BullMQ queue definition. This is the hard, system-wide concurrency
// gate for OCR work — regardless of how many HTTP requests arrive
// (4 concurrent or 4,000), only OCR_CONCURRENCY jobs are ever being
// processed at once; everything else waits in the queue instead of
// spawning new work and overwhelming the machine.
//
// The actual job processing lives in workers/ocrProcessor.js, which
// should be run as one or more SEPARATE long-lived processes (e.g. via
// pm2 or systemd), independent of the main Express app. This lets you
// scale OCR throughput by running more worker processes/machines
// without touching the web tier at all.

const { Queue } = require('bullmq');
const connection = require('../config/redisClient');

const OCR_QUEUE_NAME = 'ocr-verification';

const ocrQueue = new Queue(OCR_QUEUE_NAME, { connection });

module.exports = { ocrQueue, OCR_QUEUE_NAME };