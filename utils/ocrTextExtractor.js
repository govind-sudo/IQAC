
const crypto = require('crypto');
const { QueueEvents } = require('bullmq');
const { ocrQueue, OCR_QUEUE_NAME } = require('../queue/ocrQueue');
const redis = require('../config/redisClient');
const connection = require('../config/redisClient');

const JOB_WAIT_TIMEOUT_MS = Number(process.env.OCR_JOB_WAIT_TIMEOUT_MS) || 90_000;

let queueEvents = null;
function getQueueEvents() {
  if (!queueEvents) {
    queueEvents = new QueueEvents(OCR_QUEUE_NAME, { connection: connection.duplicate() });
  }
  return queueEvents;
}

function emptyResult(error) {
  return {
    success: false,
    fullText: '',
    englishName: null,
    hindiName: null,
    aadhaar: null,
    dob: null,
    gender: null,
    confidence: 0,
    error,
  };
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * @param {Buffer} buffer
 * @param {'pdf'|'jpeg'|'png'} detectedKind - from fileSignatureValidator.detectFileKind
 * @param {string} [fieldName] - e.g. "documents[aadhaarProof]" — used
 *        by the OCR server to decide per-document-type PDF page limits.
 * @returns {Promise<{
 *   success: boolean,
 *   fullText: string,
 *   englishName: string|null,
 *   hindiName: string|null,
 *   aadhaar: string|null,
 *   dob: string|null,
 *   gender: string|null,
 *   confidence: number,
 *   error: string|null
 * }>} structured OCR result — never throws.
 */
async function extractText(buffer, detectedKind, fieldName) {

  const hash = hashBuffer(buffer);
  const cacheKey = `ocr:${hash}:${fieldName || 'unknown'}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.error('OCR cache read failed (continuing without cache):', err.message);
  }

  try {
    const job = await ocrQueue.add(
      'ocr-job',
      { bufferBase64: buffer.toString('base64'), detectedKind, hash: cacheKey, fieldName },
      {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
      }
    );

    const result = await job.waitUntilFinished(getQueueEvents(), JOB_WAIT_TIMEOUT_MS);
    return result;
  } catch (err) {
    console.error('OCR queue processing failed:', err.message);
    return emptyResult(
      err.message?.includes('timed out')
        ? 'OCR is taking longer than usual — please try again shortly.'
        : 'Could not process this document right now — please try again.'
    );
  }
}

module.exports = { extractText };