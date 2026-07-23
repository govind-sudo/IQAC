// workers/ocrProcessor.js
//
// Run this as its own process, separate from the Express app:
//   node workers/ocrProcessor.js
//
// Each job: takes a base64-encoded file buffer + detected kind + the
// originating fieldName, POSTs it to the persistent PaddleOCR HTTP
// service (scripts/paddle_ocr_server.py), caches the structured
// result in Redis keyed by file hash + fieldName, and resolves.

const { Worker } = require('bullmq');
const connection = require('../config/redisClient');
const { OCR_QUEUE_NAME } = require('../queue/ocrQueue');

const OCR_SERVER_URL = process.env.OCR_SERVER_URL || 'http://127.0.0.1:8000';
const OCR_CACHE_TTL_SECONDS = Number(process.env.OCR_CACHE_TTL_SECONDS) || 3600;
const WORKER_CONCURRENCY = Number(process.env.OCR_QUEUE_CONCURRENCY) || 4;

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

async function callOcrServer(buffer, detectedKind, fieldName) {
  const ext = detectedKind === 'pdf' ? '.pdf' : detectedKind === 'png' ? '.png' : '.jpg';
  const form = new FormData();
  form.append('file', new Blob([buffer]), `upload${ext}`);
  if (fieldName) {
    form.append('fieldName', fieldName);
  }

  const resp = await fetch(`${OCR_SERVER_URL}/ocr`, {
    method: 'POST',
    body: form,
  });

  if (!resp.ok && resp.status !== 504) {
    throw new Error(`OCR server responded ${resp.status}`);
  }

  return resp.json();
}

const worker = new Worker(
  OCR_QUEUE_NAME,
  async (job) => {
    const { bufferBase64, detectedKind, hash, fieldName } = job.data;
    const buffer = Buffer.from(bufferBase64, 'base64');

    let result;
    try {
      result = await callOcrServer(buffer, detectedKind, fieldName);
    } catch (err) {
      console.error(`OCR job ${job.id} failed:`, err.message);
      result = emptyResult(`OCR service unreachable: ${err.message}`);
    }

    const ttl = result.success ? OCR_CACHE_TTL_SECONDS : 30;
    await connection.set(`ocr:${hash}`, JSON.stringify(result), 'EX', ttl);

    return result;
  },
  { connection, concurrency: WORKER_CONCURRENCY }
);

worker.on('completed', (job) => {
  console.log(`[ocrProcessor] job ${job.id} completed.`);
});

worker.on('failed', (job, err) => {
  console.error(`[ocrProcessor] job ${job?.id} failed:`, err?.message);
});

console.log(`[ocrProcessor] worker started, concurrency=${WORKER_CONCURRENCY}, OCR_SERVER_URL=${OCR_SERVER_URL}`);