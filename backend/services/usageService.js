const UsageEvent = require('../models/UsageEvent');
const { consumeQuota } = require('../middleware/quota');

function estimateTokens(text = '') {
  // Rough heuristic: ~4 chars per token
  return Math.max(1, Math.ceil(String(text).length / 4));
}

async function logUsage({
  userId,
  teamId,
  taskType,
  language,
  provider,
  model,
  promptText = '',
  responseText = '',
  latencyMs = 0,
  skipQuota = false,
}) {
  const tokensEst = estimateTokens(promptText) + estimateTokens(responseText);
  await UsageEvent.create({
    user: userId,
    team: teamId || undefined,
    taskType,
    language,
    provider,
    model,
    tokensEst,
    latencyMs,
  });
  if (!skipQuota) await consumeQuota(userId);
  return { tokensEst, latencyMs };
}

module.exports = { logUsage, estimateTokens };
