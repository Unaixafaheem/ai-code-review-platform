const metrics = {
  requests: 0,
  errors: 0,
  aiCalls: 0,
  aiLatencyTotalMs: 0,
  cacheHits: 0,
  cacheMisses: 0,
  startedAt: Date.now(),
};

function recordRequest() {
  metrics.requests += 1;
}

function recordError() {
  metrics.errors += 1;
}

function recordAiCall(latencyMs = 0) {
  metrics.aiCalls += 1;
  metrics.aiLatencyTotalMs += Number(latencyMs) || 0;
}

function recordCacheHit() {
  metrics.cacheHits += 1;
}

function recordCacheMiss() {
  metrics.cacheMisses += 1;
}

function getMetricsSnapshot() {
  return {
    ...metrics,
    avgAiLatencyMs:
      metrics.aiCalls > 0 ? Math.round(metrics.aiLatencyTotalMs / metrics.aiCalls) : 0,
    uptimeSec: Math.round((Date.now() - metrics.startedAt) / 1000),
  };
}

module.exports = {
  metrics,
  recordRequest,
  recordError,
  recordAiCall,
  recordCacheHit,
  recordCacheMiss,
  getMetricsSnapshot,
};
