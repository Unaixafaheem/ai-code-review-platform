const { analyzeGithubRepo, analyzeMultifile } = require('./aiService');
const { fetchRepoData } = require('./githubService');
const { loadCustomRules } = require('./rulesService');
const { logUsage } = require('./usageService');
const { writeAudit } = require('./auditService');
const { cacheKey, cacheGet, cacheSet } = require('../config/redis');
const Review = require('../models/Review');
const User = require('../models/User');

async function processHeavyJob(type, payload, onProgress = () => {}) {
  onProgress(5);

  if (type === 'github') {
    return processGithubJob(payload, onProgress);
  }
  if (type === 'multifile') {
    return processMultifileJob(payload, onProgress);
  }
  throw new Error(`Unknown job type: ${type}`);
}

async function processGithubJob(payload, onProgress) {
  const { url, userId, teamId } = payload;
  const cacheId = cacheKey({ type: 'github', url });
  const cached = await cacheGet(cacheId);
  if (cached) {
    onProgress(100);
    return { ...cached, cached: true };
  }

  onProgress(20);
  const repoData = await fetchRepoData(url);
  onProgress(50);
  const { response, meta } = await analyzeGithubRepo(repoData);
  onProgress(80);

  await logUsage({
    userId,
    teamId,
    taskType: 'github',
    language: repoData.languages[0] || 'unknown',
    provider: meta.provider,
    model: meta.model,
    promptText: url,
    responseText: response.explanation,
    latencyMs: meta.latencyMs,
  });

  const review = await Review.create({
    user: userId,
    team: teamId || undefined,
    code: `GitHub: ${repoData.owner}/${repoData.repo}`,
    language: repoData.languages[0] || 'unknown',
    githubUrl: url,
    taskType: 'github',
    response,
    provider: meta.provider,
    model: meta.model,
    tokensEst: meta.tokensEst || 0,
    latencyMs: meta.latencyMs || 0,
  });

  await writeAudit({
    actor: userId,
    team: teamId,
    action: 'ai.github.queued',
    resourceId: review._id,
    meta: { url, cached: false },
  });

  const result = {
    _id: review._id,
    taskType: 'github',
    repo: `${repoData.owner}/${repoData.repo}`,
    stars: repoData.stars,
    languages: repoData.languages,
    createdAt: review.createdAt,
    meta,
    cached: false,
    ...response,
  };

  await cacheSet(cacheId, result);
  onProgress(100);
  return result;
}

async function processMultifileJob(payload, onProgress) {
  const { files, userId, teamId } = payload;
  const user = await User.findById(userId);
  const customRules = user ? await loadCustomRules(user) : [];

  const cacheId = cacheKey({
    type: 'multifile',
    files: files.map((f) => ({ path: f.path, content: f.content })),
    rules: customRules.map((r) => r.title),
  });
  const cached = await cacheGet(cacheId);
  if (cached) {
    onProgress(100);
    return { ...cached, cached: true };
  }

  onProgress(30);
  const { response, meta, files: normalized } = await analyzeMultifile(files, customRules);
  onProgress(75);

  await logUsage({
    userId,
    teamId,
    taskType: 'multifile',
    language: 'multifile',
    provider: meta.provider,
    model: meta.model,
    promptText: normalized.map((f) => f.path).join(','),
    responseText: response.explanation,
    latencyMs: meta.latencyMs,
  });

  const review = await Review.create({
    user: userId,
    team: teamId || undefined,
    code: normalized.map((f) => `// ${f.path}\n${f.content}`).join('\n\n'),
    language: 'multifile',
    taskType: 'multifile',
    files: normalized,
    response,
    rulesApplied: customRules.map((r) => r.title),
    provider: meta.provider,
    model: meta.model,
    tokensEst: meta.tokensEst || 0,
    latencyMs: meta.latencyMs || 0,
  });

  await writeAudit({
    actor: userId,
    team: teamId,
    action: 'ai.multifile.queued',
    resourceId: review._id,
    meta: { fileCount: normalized.length },
  });

  const result = {
    _id: review._id,
    taskType: 'multifile',
    fileCount: normalized.length,
    files: normalized.map((f) => ({
      path: f.path,
      language: f.language,
      content: f.content,
    })),
    createdAt: review.createdAt,
    meta,
    cached: false,
    ...response,
  };

  await cacheSet(cacheId, result);
  onProgress(100);
  return result;
}

module.exports = { processHeavyJob };
