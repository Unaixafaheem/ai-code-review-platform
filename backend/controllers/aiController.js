const {
  analyzeCode,
  analyzeCodeStream,
  analyzeMultifile,
  analyzeMultifileStream,
  analyzeGithubRepo,
  compareModels,
} = require('../services/aiService');
const { fetchRepoData } = require('../services/githubService');
const { loadCustomRules } = require('../services/rulesService');
const { logUsage } = require('../services/usageService');
const { writeAudit } = require('../services/auditService');
const { cacheKey, cacheGet, cacheSet } = require('../config/redis');
const { recordAiCall, recordCacheHit, recordCacheMiss } = require('../services/metricsService');
const { scanSecrets, redactSecrets } = require('../services/secretScanner');
const Review = require('../models/Review');

function sendSse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function persistReview({
  userId,
  teamId,
  code,
  language,
  targetLanguage,
  error,
  taskType,
  githubUrl,
  files,
  response,
  meta,
  rulesApplied,
  compareResults,
}) {
  return Review.create({
    user: userId,
    team: teamId || undefined,
    code,
    language,
    targetLanguage,
    error,
    taskType,
    githubUrl,
    files,
    response,
    rulesApplied: rulesApplied || [],
    provider: meta?.provider,
    model: meta?.model,
    tokensEst: meta?.tokensEst || 0,
    latencyMs: meta?.latencyMs || 0,
    compareResults,
  });
}

const scanCodeSecrets = async (req, res) => {
  try {
    const code = req.body?.code || '';
    const findings = scanSecrets(code);
    const { redacted } = redactSecrets(code);
    res.json({
      hasSecrets: findings.length > 0,
      secrets: findings,
      redacted: findings.length ? redacted : code,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const analyze = async (req, res) => {
  try {
    const { code, error, task = 'review', language = 'javascript', targetLanguage } = req.body;

    if (!code?.trim()) {
      return res.status(400).json({ message: 'Code is required' });
    }

    const customRules = await loadCustomRules(req.userDoc);
    const key = cacheKey({
      type: 'analyze',
      code,
      error,
      task,
      language,
      targetLanguage,
      rules: customRules.map((r) => `${r.title}:${r.description}`),
    });

    let response;
    let meta;
    let cached = false;

    const hit = await cacheGet(key);
    if (hit?.response) {
      response = hit.response;
      meta = { ...hit.meta, cached: true, latencyMs: 0 };
      cached = true;
      recordCacheHit();
    } else {
      recordCacheMiss();
      const result = await analyzeCode({
        code,
        error,
        task,
        language,
        targetLanguage,
        customRules,
      });
      response = result.response;
      meta = result.meta;
      recordAiCall(meta.latencyMs);
      await cacheSet(key, { response, meta });
    }

    await logUsage({
      userId: req.user.id,
      teamId: req.userDoc.activeTeam,
      taskType: task,
      language,
      provider: meta.provider,
      model: meta.model,
      promptText: code,
      responseText: response.explanation + response.improvedCode,
      latencyMs: meta.latencyMs,
      skipQuota: cached,
    });

    // Always count quota for cache hits too (product decision: free tier still limited)
    // Actually skipQuota on cache means no consume - user asked to cut cost. Don't consume on cache hit.
    // But then free users could spam - better: still consume quota on cache hit for fairness
    if (cached) {
      const { consumeQuota } = require('../middleware/quota');
      await consumeQuota(req.user.id);
    }

    const review = await persistReview({
      userId: req.user.id,
      teamId: req.userDoc.activeTeam,
      code,
      language,
      targetLanguage: task === 'convert' ? targetLanguage : undefined,
      error: task === 'debug' ? error : undefined,
      taskType: task,
      response,
      meta,
      rulesApplied: customRules.map((r) => r.title),
    });

    await writeAudit({
      actor: req.user.id,
      team: req.userDoc.activeTeam,
      action: 'ai.analyze',
      resourceId: review._id,
      meta: { task, language, cached, secretsRedacted: !!req.secretsRedacted },
      req,
    });

    res.status(201).json({
      _id: review._id,
      taskType: review.taskType,
      language: review.language,
      createdAt: review.createdAt,
      meta,
      cached,
      rulesApplied: review.rulesApplied,
      quota: req.quota,
      secrets: req.secretFindings || [],
      ...response,
    });
  } catch (error) {
    console.error('AI analyze error:', error.message);
    const status = error.message.includes('API key') ? 503 : 500;
    res.status(status).json({ message: error.message || 'AI analysis failed' });
  }
};

const analyzeStream = async (req, res) => {
  const { code, error, task = 'review', language = 'javascript', targetLanguage } = req.body;

  if (!code?.trim()) {
    return res.status(400).json({ message: 'Code is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  try {
    sendSse(res, 'status', { message: 'Analyzing…', quota: req.quota });

    const customRules = await loadCustomRules(req.userDoc);
    const key = cacheKey({
      type: 'analyze',
      code,
      error,
      task,
      language,
      targetLanguage,
      rules: customRules.map((r) => `${r.title}:${r.description}`),
    });

    let response;
    let meta;
    let cached = false;

    const hit = await cacheGet(key);
    if (hit?.response) {
      response = hit.response;
      meta = { ...hit.meta, cached: true, latencyMs: 0 };
      cached = true;
      recordCacheHit();
      sendSse(res, 'status', { message: 'Cache hit — returning instantly' });
    } else {
      recordCacheMiss();
      const result = await analyzeCodeStream(
        { code, error, task, language, targetLanguage, customRules },
        (token) => sendSse(res, 'token', { token })
      );
      response = result.response;
      meta = result.meta;
      recordAiCall(meta.latencyMs);
      await cacheSet(key, { response, meta });
    }

    await logUsage({
      userId: req.user.id,
      teamId: req.userDoc.activeTeam,
      taskType: task,
      language,
      provider: meta.provider,
      model: meta.model,
      promptText: code,
      responseText: response.explanation + response.improvedCode,
      latencyMs: meta.latencyMs,
      skipQuota: cached,
    });
    if (cached) {
      const { consumeQuota } = require('../middleware/quota');
      await consumeQuota(req.user.id);
    }

    const review = await persistReview({
      userId: req.user.id,
      teamId: req.userDoc.activeTeam,
      code,
      language,
      targetLanguage: task === 'convert' ? targetLanguage : undefined,
      error: task === 'debug' ? error : undefined,
      taskType: task,
      response,
      meta,
      rulesApplied: customRules.map((r) => r.title),
    });

    await writeAudit({
      actor: req.user.id,
      team: req.userDoc.activeTeam,
      action: 'ai.analyze.stream',
      resourceId: review._id,
      meta: { task, language, cached },
      req,
    });

    sendSse(res, 'done', {
      _id: review._id,
      taskType: review.taskType,
      language: review.language,
      createdAt: review.createdAt,
      meta,
      cached,
      rulesApplied: review.rulesApplied,
      quota: req.quota,
      ...response,
    });
  } catch (error) {
    console.error('AI stream error:', error.message);
    sendSse(res, 'error', { message: error.message || 'AI analysis failed' });
  } finally {
    res.end();
  }
};

const analyzeGithub = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url?.trim()) {
      return res.status(400).json({ message: 'GitHub URL is required' });
    }

    const repoData = await fetchRepoData(url.trim());
    const { response, meta } = await analyzeGithubRepo(repoData);

    await logUsage({
      userId: req.user.id,
      teamId: req.userDoc.activeTeam,
      taskType: 'github',
      language: repoData.languages[0] || 'unknown',
      provider: meta.provider,
      model: meta.model,
      promptText: url,
      responseText: response.explanation,
      latencyMs: meta.latencyMs,
    });

    const review = await persistReview({
      userId: req.user.id,
      teamId: req.userDoc.activeTeam,
      code: `GitHub: ${repoData.owner}/${repoData.repo}`,
      language: repoData.languages[0] || 'unknown',
      githubUrl: url.trim(),
      taskType: 'github',
      response,
      meta,
    });

    res.status(201).json({
      _id: review._id,
      taskType: 'github',
      repo: `${repoData.owner}/${repoData.repo}`,
      stars: repoData.stars,
      languages: repoData.languages,
      createdAt: review.createdAt,
      meta,
      ...response,
    });
  } catch (error) {
    console.error('GitHub analyze error:', error.message);
    res.status(500).json({ message: error.message || 'GitHub analysis failed' });
  }
};

const analyzeMultifileHandler = async (req, res) => {
  try {
    let files = req.body.files;
    if (req.extractedFiles?.length) files = req.extractedFiles;

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: 'Provide files[] or upload a .zip' });
    }

    const customRules = await loadCustomRules(req.userDoc);
    const { response, meta, files: normalized } = await analyzeMultifile(files, customRules);

    await logUsage({
      userId: req.user.id,
      teamId: req.userDoc.activeTeam,
      taskType: 'multifile',
      language: 'multifile',
      provider: meta.provider,
      model: meta.model,
      promptText: normalized.map((f) => f.path).join(','),
      responseText: response.explanation,
      latencyMs: meta.latencyMs,
    });

    const review = await persistReview({
      userId: req.user.id,
      teamId: req.userDoc.activeTeam,
      code: normalized.map((f) => `// ${f.path}\n${f.content}`).join('\n\n'),
      language: 'multifile',
      taskType: 'multifile',
      files: normalized,
      response,
      meta,
      rulesApplied: customRules.map((r) => r.title),
    });

    res.status(201).json({
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
      ...response,
    });
  } catch (error) {
    console.error('Multifile analyze error:', error.message);
    res.status(500).json({ message: error.message || 'Multifile analysis failed' });
  }
};

const analyzeMultifileStreamHandler = async (req, res) => {
  let files = req.body.files;
  if (req.extractedFiles?.length) files = req.extractedFiles;

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ message: 'Provide files[] or upload a .zip' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  try {
    sendSse(res, 'status', { message: 'Analyzing project…' });
    const customRules = await loadCustomRules(req.userDoc);

    const { response, meta, files: normalized } = await analyzeMultifileStream(
      files,
      (token) => sendSse(res, 'token', { token }),
      customRules
    );

    await logUsage({
      userId: req.user.id,
      teamId: req.userDoc.activeTeam,
      taskType: 'multifile',
      language: 'multifile',
      provider: meta.provider,
      model: meta.model,
      promptText: normalized.map((f) => f.path).join(','),
      responseText: response.explanation,
      latencyMs: meta.latencyMs,
    });

    const review = await persistReview({
      userId: req.user.id,
      teamId: req.userDoc.activeTeam,
      code: normalized.map((f) => `// ${f.path}\n${f.content}`).join('\n\n'),
      language: 'multifile',
      taskType: 'multifile',
      files: normalized,
      response,
      meta,
      rulesApplied: customRules.map((r) => r.title),
    });

    sendSse(res, 'done', {
      _id: review._id,
      taskType: 'multifile',
      fileCount: normalized.length,
      files: normalized.map((f) => ({ path: f.path, language: f.language, content: f.content })),
      createdAt: review.createdAt,
      meta,
      ...response,
    });
  } catch (error) {
    console.error('Multifile stream error:', error.message);
    sendSse(res, 'error', { message: error.message || 'Multifile analysis failed' });
  } finally {
    res.end();
  }
};

const compare = async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;
    if (!code?.trim()) return res.status(400).json({ message: 'Code is required' });

    const customRules = await loadCustomRules(req.userDoc);
    const results = await compareModels({ code, language, customRules });

    const okResults = results.filter((r) => r.ok);
    const primary = okResults[0]?.response || {
      explanation: 'Comparison incomplete — check API keys for both providers.',
      fix: results.map((r) => `${r.meta.provider}: ${r.error || 'ok'}`).join('\n'),
      improvedCode: code,
      bestPractices: 'N/A',
      complexity: 'N/A',
      annotations: [],
      issues: [],
    };

    const compareResults = results.map((r) => ({
      provider: r.meta.provider,
      model: r.meta.model,
      latencyMs: r.meta.latencyMs || 0,
      tokensEst: r.meta.tokensEst || 0,
      estimatedCostUsd: r.meta.estimatedCostUsd || 0,
      response: r.response || undefined,
      error: r.error,
    }));

    for (let i = 0; i < okResults.length; i++) {
      const r = okResults[i];
      await logUsage({
        userId: req.user.id,
        teamId: req.userDoc.activeTeam,
        taskType: 'compare',
        language,
        provider: r.meta.provider,
        model: r.meta.model,
        promptText: code,
        responseText: r.response?.explanation || '',
        latencyMs: r.meta.latencyMs,
        skipQuota: i > 0,
      });
    }

    // compare counts as one quota unit already consumed per successful provider via logUsage;
    // if both fail, don't leave a review
    if (!okResults.length) {
      return res.status(503).json({
        message: 'Both providers failed. Ensure GROQ_API_KEY and OPENAI_API_KEY are set.',
        results: compareResults,
      });
    }

    const review = await persistReview({
      userId: req.user.id,
      teamId: req.userDoc.activeTeam,
      code,
      language,
      taskType: 'compare',
      response: primary,
      meta: okResults[0].meta,
      rulesApplied: customRules.map((r) => r.title),
      compareResults: compareResults.filter((c) => c.response),
    });

    res.status(201).json({
      _id: review._id,
      taskType: 'compare',
      language,
      createdAt: review.createdAt,
      results: compareResults,
      ...primary,
    });
  } catch (error) {
    console.error('Compare error:', error.message);
    res.status(500).json({ message: error.message || 'Model comparison failed' });
  }
};

module.exports = {
  analyze,
  analyzeStream,
  analyzeGithub,
  analyzeMultifileHandler,
  analyzeMultifileStreamHandler,
  compare,
  scanCodeSecrets,
};
