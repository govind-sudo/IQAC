const { Queue } = require('bullmq');
const connection = require('../config/redisClient');

const OCR_QUEUE_NAME = 'ocr-verification';

const ocrQueue = new Queue(OCR_QUEUE_NAME, { connection });

module.exports = { ocrQueue, OCR_QUEUE_NAME };