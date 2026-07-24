const axios = require('axios');

const VALID_TASKS = [
  'review',
  'debug',
  'optimize',
  'explain',
  'convert',
  'security',
  'docs',
  'multifile',
  'test',
  'refactor',
];

const STREAM_TASKS = [
  'review',
  'debug',
  'optimize',
  'explain',
  'convert',
  'security',
  'docs',
  'test',
  'refactor',
];

const TASK_INSTRUCTIONS = {
  review: `Perform a thorough code review. Identify bugs, code smells, security issues, and style problems.
Provide actionable feedback and an improved version of the code.`,

  debug: `The user is encountering an error. Diagnose the root cause, explain why the error occurs, and provide a fixed version of the code.
Focus on the specific error message provided.`,

  optimize: `Analyze the code for performance bottlenecks and inefficiencies.
Suggest optimizations for time/space complexity, memory usage, and runtime performance. Provide an optimized version.`,

  explain: `Explain this code in beginner-friendly terms. Break down what each section does, why it was written this way, and key programming concepts used.
Use simple language suitable for someone learning to code.`,

  convert: `Convert the code to the target language specified. Preserve logic and behavior while following idiomatic conventions of the target language.`,

  security: `Perform a security audit. Detect and explain:
- XSS (Cross-Site Scripting) vulnerabilities
- SQL injection risks
- Unsafe eval(), innerHTML, or dynamic code execution
- Hardcoded secrets, API keys, or credentials
- Insecure dependencies or missing input validation
- CSRF, path traversal, and authentication flaws
Rate each finding by severity (critical/high/medium/low) and provide secure fixes.`,

  docs: `Generate comprehensive documentation:
- A complete README.md with project description, setup, usage, and API docs
- JSDoc/docstring comments for all functions and classes
- improvedCode should contain the fully documented code with inline docs
- bestPractices should list documentation standards followed`,

  multifile: `Perform a cross-file project review. Analyze relationships between files:
- Unused or missing imports across files
- Inconsistent naming/patterns
- Broken references between modules
- Shared bugs or duplicated logic
- Architecture and coupling issues
In annotations/issues, set the "file" field to the relative path for each finding.
In improvedCode, provide the most critical fixed file (or a consolidated patch summary as code comments + key fixes).`,

  test: `Generate comprehensive unit tests for the provided code.
- For JavaScript/TypeScript: Jest (describe/it/expect)
- For Python: pytest
- Cover happy paths, edge cases, and error cases
- improvedCode MUST contain the complete runnable test file
- explanation should describe the test strategy
- fix can summarize gaps in original code that tests reveal`,

  refactor: `Suggest a high-quality refactor focused on naming and structure:
- Better function/variable/class names
- Extract helpers for duplicated or complex logic
- Simplify control flow (prefer early returns where helpful)
- Preserve behavior exactly
- improvedCode MUST be the fully refactored code
- fix should list rename map and extracted helpers`,
};

const JSON_SCHEMA = `{
  "explanation": "Clear explanation of the code, issues found, or concepts (2-4 paragraphs)",
  "fix": "Specific fix description or step-by-step solution for the identified problems",
  "improvedCode": "The complete improved, fixed, optimized, converted, documented, tested, or refactored code as a string",
  "bestPractices": "Relevant best practices, patterns, or recommendations (bullet points as a single string)",
  "complexity": "Time complexity: O(?) — Space complexity: O(?) with brief justification.",
  "issues": [
    {
      "line": 1,
      "severity": "critical | high | medium | low",
      "confidence": 85,
      "message": "Actionable finding",
      "category": "bug | security | style | performance | naming | test | other",
      "file": "optional path"
    }
  ],
  "annotations": [
    {
      "line": 1,
      "severity": "error | warning | info",
      "message": "Short gutter marker text",
      "file": "optional path"
    }
  ]
}`;

const SEVERITY_TO_MARKER = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'info',
};

function buildSystemPrompt(task, { language, targetLanguage, error, customRules }) {
  let taskBlock = TASK_INSTRUCTIONS[task] || TASK_INSTRUCTIONS.review;

  if (task === 'debug' && error) {
    taskBlock += `\n\nError message:\n${error}`;
  }

  if (task === 'convert' && targetLanguage) {
    taskBlock += `\n\nTarget language: ${targetLanguage}`;
  }

  let rulesBlock = '';
  if (Array.isArray(customRules) && customRules.length) {
    rulesBlock = `\n\nCUSTOM TEAM / USER STYLE RULES (must follow):\n${customRules
      .map((r, i) => `${i + 1}. ${r.title}: ${r.description}`)
      .join('\n')}`;
  }

  return `You are an expert senior software engineer with deep knowledge across multiple programming languages, security, and software engineering best practices.

${taskBlock}
${rulesBlock}

Source language: ${language || 'auto-detect'}

You MUST respond with valid JSON only — no markdown fences, no extra text. Use this exact structure:
${JSON_SCHEMA}

Rules:
- improvedCode must be complete, runnable code (not pseudocode or snippets with "...")
- For explain mode, improvedCode can be the same code with helpful inline comments added
- For convert mode, improvedCode must be in the target language
- For docs mode, improvedCode must include full README content at the top as comments, then documented code
- For test mode, improvedCode must be a complete test suite file
- For refactor mode, improvedCode must be the fully renamed/refactored source
- For security mode, fix must list each vulnerability with severity and remediation
- complexity must always include explicit Big-O notation for both time AND space
- issues MUST be an array (prefer 3–12). Each issue needs severity (critical/high/medium/low) and confidence (0-100 integer)
- annotations MUST mirror issues for the editor gutter (map critical/high→error, medium→warning, low→info)
- line numbers are 1-based relative to the provided source
- Keep explanation accessible but technically accurate`;
}

function buildUserPrompt(code) {
  return `Analyze the following code:\n\n\`\`\`\n${code}\n\`\`\``;
}

function buildMultifilePrompt(files) {
  const blocks = files
    .map(
      (f) =>
        `--- FILE: ${f.path} (${f.language || 'auto'}) ---\n\`\`\`\n${f.content}\n\`\`\``
    )
    .join('\n\n');

  return `Analyze this multi-file project for cross-file issues (imports, consistency, coupling, bugs):\n\n${blocks}`;
}

function buildGithubPrompt(repoData) {
  return `Analyze this GitHub repository and provide architecture review.

Repository: ${repoData.owner}/${repoData.repo}
Description: ${repoData.description}
Stars: ${repoData.stars} | Forks: ${repoData.forks}
Languages: ${repoData.languages.join(', ')}
Topics: ${repoData.topics.join(', ')}

File tree (sample):
${repoData.fileTree.slice(0, 50).join('\n')}

README excerpt:
${repoData.readme || 'No README found'}

Config files:
${Object.entries(repoData.configs)
  .map(([k, v]) => `--- ${k} ---\n${v}`)
  .join('\n\n')}`;
}

function getAIConfig(providerOverride) {
  const provider = (providerOverride || process.env.AI_PROVIDER || 'groq').toLowerCase();

  if (provider === 'openai') {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      provider: 'openai',
      // approximate USD per 1M tokens (input+output blended estimate)
      costPer1M: 0.3,
    };
  }

  return {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    provider: 'groq',
    costPer1M: 0.05,
  };
}

function normalizeIssues(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((i) => {
      const severity = ['critical', 'high', 'medium', 'low'].includes(i.severity)
        ? i.severity
        : 'medium';
      let confidence = Number(i.confidence);
      if (Number.isNaN(confidence)) confidence = 70;
      confidence = Math.max(0, Math.min(100, Math.round(confidence)));
      return {
        line: Number(i.line) || 1,
        severity,
        confidence,
        message: String(i.message || 'Issue found'),
        category: String(i.category || 'general'),
        file: i.file ? String(i.file) : undefined,
      };
    })
    .filter((i) => i.message)
    .slice(0, 50);
}

function normalizeAnnotations(raw, issues = []) {
  let annotations = [];
  if (Array.isArray(raw) && raw.length) {
    annotations = raw.map((a) => ({
      line: Number(a.line) || 1,
      severity: ['error', 'warning', 'info'].includes(a.severity) ? a.severity : 'warning',
      message: String(a.message || 'Issue found'),
      file: a.file ? String(a.file) : undefined,
    }));
  } else if (issues.length) {
    annotations = issues.map((i) => ({
      line: i.line,
      severity: SEVERITY_TO_MARKER[i.severity] || 'warning',
      message: `${i.message} (${i.confidence}% conf.)`,
      file: i.file,
    }));
  }
  return annotations.filter((a) => a.message && a.line > 0).slice(0, 50);
}

async function callAI(systemPrompt, userPrompt, providerOverride) {
  const config = getAIConfig(providerOverride);

  if (!config.apiKey) {
    throw new Error(
      `Missing API key for ${config.provider}. Set ${config.provider === 'openai' ? 'OPENAI_API_KEY' : 'GROQ_API_KEY'} in .env`
    );
  }

  const started = Date.now();
  const { data } = await axios.post(
    config.url,
    {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4096,
    },
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 90000,
    }
  );

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from AI provider');
  return {
    content,
    meta: {
      provider: config.provider,
      model: config.model,
      latencyMs: Date.now() - started,
      costPer1M: config.costPer1M,
    },
  };
}

async function callAIStream(systemPrompt, userPrompt, onToken, providerOverride) {
  const config = getAIConfig(providerOverride);

  if (!config.apiKey) {
    throw new Error(
      `Missing API key for ${config.provider}. Set ${config.provider === 'openai' ? 'OPENAI_API_KEY' : 'GROQ_API_KEY'} in .env`
    );
  }

  const started = Date.now();
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI stream failed (${response.status}): ${errText.slice(0, 200)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content || '';
        if (delta) {
          full += delta;
          if (onToken) onToken(delta);
        }
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }

  if (!full.trim()) throw new Error('Empty streamed response from AI provider');
  return {
    content: full,
    meta: {
      provider: config.provider,
      model: config.model,
      latencyMs: Date.now() - started,
      costPer1M: config.costPer1M,
    },
  };
}

function parseAIResponse(content) {
  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returned invalid JSON');
    parsed = JSON.parse(jsonMatch[0]);
  }

  const required = ['explanation', 'fix', 'improvedCode', 'bestPractices', 'complexity'];
  for (const field of required) {
    if (parsed[field] == null || parsed[field] === '') {
      parsed[field] = 'Not available';
    }
  }

  const issues = normalizeIssues(parsed.issues);
  const annotations = normalizeAnnotations(parsed.annotations, issues);

  return {
    explanation: String(parsed.explanation),
    fix: String(parsed.fix),
    improvedCode: String(parsed.improvedCode),
    bestPractices: String(parsed.bestPractices),
    complexity: String(parsed.complexity),
    annotations,
    issues,
  };
}

function estimateTokensFromText(...parts) {
  const len = parts.reduce((s, p) => s + String(p || '').length, 0);
  return Math.max(1, Math.ceil(len / 4));
}

function withMeta(response, meta, prompts = {}) {
  const tokensEst = estimateTokensFromText(
    prompts.system,
    prompts.user,
    response.explanation,
    response.fix,
    response.improvedCode
  );
  const estimatedCostUsd = Number(
    ((tokensEst / 1_000_000) * (meta.costPer1M || 0.1)).toFixed(6)
  );
  return {
    response,
    meta: {
      provider: meta.provider,
      model: meta.model,
      latencyMs: meta.latencyMs,
      tokensEst,
      estimatedCostUsd,
    },
  };
}

async function analyzeCode({ code, error, task, language, targetLanguage, customRules, provider }) {
  if (!code?.trim()) throw new Error('Code is required');
  if (!VALID_TASKS.includes(task)) {
    throw new Error(`Invalid task. Must be one of: ${VALID_TASKS.join(', ')}`);
  }
  if (task === 'debug' && !error?.trim()) {
    throw new Error('Error message is required for debug mode');
  }
  if (task === 'convert' && !targetLanguage?.trim()) {
    throw new Error('Target language is required for convert mode');
  }

  const system = buildSystemPrompt(task, { language, targetLanguage, error, customRules });
  const user = buildUserPrompt(code);
  const { content, meta } = await callAI(system, user, provider);
  return withMeta(parseAIResponse(content), meta, { system, user });
}

async function analyzeCodeStream(
  { code, error, task, language, targetLanguage, customRules, provider },
  onToken
) {
  if (!code?.trim()) throw new Error('Code is required');
  if (!STREAM_TASKS.includes(task)) {
    throw new Error(`Invalid stream task: ${task}`);
  }
  if (task === 'debug' && !error?.trim()) {
    throw new Error('Error message is required for debug mode');
  }
  if (task === 'convert' && !targetLanguage?.trim()) {
    throw new Error('Target language is required for convert mode');
  }

  const system = buildSystemPrompt(task, { language, targetLanguage, error, customRules });
  const user = buildUserPrompt(code);
  const { content, meta } = await callAIStream(system, user, onToken, provider);
  return withMeta(parseAIResponse(content), meta, { system, user });
}

async function analyzeMultifile(files, customRules) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('At least one file is required');
  }
  if (files.length > 20) throw new Error('Maximum 20 files per review');

  const normalized = files.map((f) => ({
    path: String(f.path || 'untitled').slice(0, 260),
    content: String(f.content || '').slice(0, 30000),
    language: f.language || 'javascript',
  }));

  const totalSize = normalized.reduce((sum, f) => sum + f.content.length, 0);
  if (totalSize > 120000) throw new Error('Combined file content exceeds 120KB limit');

  const system = buildSystemPrompt('multifile', { language: 'multi', customRules });
  const user = buildMultifilePrompt(normalized);
  const { content, meta } = await callAI(system, user);
  const wrapped = withMeta(parseAIResponse(content), meta, { system, user });
  return { ...wrapped, files: normalized };
}

async function analyzeMultifileStream(files, onToken, customRules) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('At least one file is required');
  }

  const normalized = files.map((f) => ({
    path: String(f.path || 'untitled').slice(0, 260),
    content: String(f.content || '').slice(0, 30000),
    language: f.language || 'javascript',
  }));

  const system = buildSystemPrompt('multifile', { language: 'multi', customRules });
  const user = buildMultifilePrompt(normalized);
  const { content, meta } = await callAIStream(system, user, onToken);
  const wrapped = withMeta(parseAIResponse(content), meta, { system, user });
  return { ...wrapped, files: normalized };
}

async function analyzeGithubRepo(repoData) {
  const systemPrompt = `You are an expert software architect and senior engineer performing a GitHub repository audit.

Analyze the repository structure, architecture, code organization, and potential issues.

You MUST respond with valid JSON only matching this schema:
${JSON_SCHEMA}

Fill issues/annotations when you find concrete problems.`;

  const user = buildGithubPrompt(repoData);
  const { content, meta } = await callAI(systemPrompt, user);
  return withMeta(parseAIResponse(content), meta, { system: systemPrompt, user });
}

async function analyzePullRequest({ owner, repo, pullNumber, files }) {
  const systemPrompt = `You are an expert code reviewer bot commenting on a GitHub pull request.

Review the changed files for bugs, security issues, and style problems.

Respond with valid JSON only:
{
  "summary": "2-4 sentence overall PR review summary",
  "event": "COMMENT",
  "comments": [
    {
      "path": "relative/file/path.js",
      "line": 10,
      "severity": "error | warning | info",
      "body": "Markdown comment for this line — be specific and actionable"
    }
  ],
  "explanation": "Longer review narrative",
  "fix": "Top issues to address before merge",
  "improvedCode": "Key suggested patch or example fix",
  "bestPractices": "Style and engineering recommendations",
  "complexity": "Estimated review risk: low/medium/high with brief justification",
  "issues": [],
  "annotations": []
}

Rules:
- comments must reference paths that appear in the provided files
- line must exist in that file (1-based)
- Prefer at most 12 high-signal comments
- event should be COMMENT`;

  const fileBlocks = files
    .slice(0, 12)
    .map((f) => `--- ${f.path} ---\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n');

  const userPrompt = `PR: ${owner}/${repo}#${pullNumber}\n\nChanged files:\n${fileBlocks}`;
  const { content, meta } = await callAI(systemPrompt, userPrompt);

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('PR AI returned invalid JSON');
    parsed = JSON.parse(match[0]);
  }

  const response = parseAIResponse(
    JSON.stringify({
      explanation: parsed.explanation || parsed.summary || 'PR review complete',
      fix: parsed.fix || 'See comments',
      improvedCode: parsed.improvedCode || 'N/A',
      bestPractices: parsed.bestPractices || 'N/A',
      complexity: parsed.complexity || 'Risk: medium',
      annotations: parsed.annotations || [],
      issues: parsed.issues || [],
    })
  );

  const comments = Array.isArray(parsed.comments)
    ? parsed.comments
        .filter((c) => c.path && c.body && Number(c.line) > 0)
        .slice(0, 12)
        .map((c) => ({
          path: String(c.path),
          line: Number(c.line),
          body: `**[${(c.severity || 'info').toUpperCase()}]** ${String(c.body)}`,
        }))
    : [];

  return {
    summary: String(parsed.summary || response.explanation.slice(0, 280)),
    event: 'COMMENT',
    comments,
    ...withMeta(response, meta, { system: systemPrompt, user: userPrompt }),
  };
}

/**
 * Run the same review through Groq and OpenAI in parallel for comparison.
 */
async function compareModels({ code, language = 'javascript', customRules }) {
  if (!code?.trim()) throw new Error('Code is required');

  const providers = ['groq', 'openai'];
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        const result = await analyzeCode({
          code,
          task: 'review',
          language,
          customRules,
          provider,
        });
        return { ok: true, ...result };
      } catch (err) {
        return {
          ok: false,
          meta: { provider, model: getAIConfig(provider).model, latencyMs: 0, tokensEst: 0, estimatedCostUsd: 0 },
          error: err.message,
          response: null,
        };
      }
    })
  );

  return results;
}

module.exports = {
  analyzeCode,
  analyzeCodeStream,
  analyzeMultifile,
  analyzeMultifileStream,
  analyzeGithubRepo,
  analyzePullRequest,
  compareModels,
  VALID_TASKS,
  STREAM_TASKS,
  parseAIResponse,
  callAIStream,
  getAIConfig,
};
