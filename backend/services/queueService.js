const { Queue, Worker } = require('bullmq');
const { getRedis, isRedisEnabled } = require('../config/redis');

const QUEUE_NAME = 'ai-heavy-jobs';

let queue = null;
let workerStarted = false;
const memoryJobs = new Map();

function getConnection() {
  const client = getRedis();
  if (!client) return null;
  // BullMQ wants connection options, not necessarily shared instance
  return { url: process.env.REDIS_URL, maxRetriesPerRequest: null };
}

function getQueue() {
  if (!isRedisEnabled()) return null;
  if (queue) return queue;
  const connection = getConnection();
  if (!connection) return null;
  queue = new Queue(QUEUE_NAME, { connection });
  return queue;
}

async function enqueueJob(type, payload, opts = {}) {
  const q = getQueue();
  if (!q) {
    // In-memory immediate processing fallback
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    memoryJobs.set(id, { id, type, payload, status: 'waiting', createdAt: Date.now() });
    setImmediate(() => processMemoryJob(id));
    return { id, queued: false, mode: 'inline' };
  }

  const job = await q.add(type, payload, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 50,
    ...opts,
  });
  return { id: String(job.id), queued: true, mode: 'bullmq' };
}

async function getJobStatus(jobId) {
  if (String(jobId).startsWith('mem_')) {
    const job = memoryJobs.get(jobId);
    if (!job) return null;
    return {
      id: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
      progress: job.progress || 0,
    };
  }

  const q = getQueue();
  if (!q) return null;
  const job = await q.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  return {
    id: String(job.id),
    status: state,
    result: job.returnvalue,
    error: job.failedReason,
    progress: job.progress,
  };
}

async function processMemoryJob(id) {
  const job = memoryJobs.get(id);
  if (!job) return;
  job.status = 'active';
  try {
    const { processHeavyJob } = require('./jobProcessors');
    job.result = await processHeavyJob(job.type, job.payload, (p) => {
      job.progress = p;
    });
    job.status = 'completed';
  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
  }
}

function startWorker() {
  if (workerStarted || !isRedisEnabled()) return;
  const connection = getConnection();
  if (!connection) return;

  workerStarted = true;
  const { processHeavyJob } = require('./jobProcessors');

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => processHeavyJob(job.name, job.data, (p) => job.updateProgress(p)),
    { connection, concurrency: 2 }
  );

  worker.on('completed', (job) => console.log(`[queue] completed ${job.id}`));
  worker.on('failed', (job, err) => console.warn(`[queue] failed ${job?.id}:`, err.message));
  console.log('[queue] BullMQ worker started');
}

module.exports = {
  enqueueJob,
  getJobStatus,
  startWorker,
  getQueue,
  QUEUE_NAME,
};
