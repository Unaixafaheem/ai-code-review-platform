const crypto = require('crypto');
const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');
const { analyzePullRequest } = require('../services/aiService');
const Review = require('../models/Review');

const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h',
  '.cs', '.rb', '.php', '.swift', '.kt', '.vue', '.svelte', '.css', '.scss', '.html',
  '.json', '.yml', '.yaml', '.md', '.sql',
]);

function verifyGithubSignature(rawBody, signature) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return !process.env.NODE_ENV || process.env.NODE_ENV !== 'production';
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = `sha256=${hmac.update(rawBody).digest('hex')}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function getOctokit() {
  if (process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY) {
    const auth = createAppAuth({
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n'),
      installationId: process.env.GITHUB_INSTALLATION_ID
        ? Number(process.env.GITHUB_INSTALLATION_ID)
        : undefined,
    });

    const installationAuth = await auth({ type: 'installation' });
    return new Octokit({ auth: installationAuth.token });
  }

  if (process.env.GITHUB_TOKEN) {
    return new Octokit({ auth: process.env.GITHUB_TOKEN });
  }

  throw new Error('Configure GITHUB_APP_ID + GITHUB_PRIVATE_KEY (+ INSTALLATION_ID) or GITHUB_TOKEN');
}

function guessLanguage(path) {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  const map = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.cpp': 'cpp',
    '.c': 'c',
    '.rb': 'ruby',
    '.php': 'php',
  };
  return map[ext] || 'plaintext';
}

async function fetchPrFiles(octokit, owner, repo, pullNumber, headSha) {
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 50,
  });

  const selected = files
    .filter((f) => f.status !== 'removed')
    .filter((f) => {
      const ext = f.filename.slice(f.filename.lastIndexOf('.')).toLowerCase();
      return CODE_EXTENSIONS.has(ext);
    })
    .slice(0, 12);

  const results = [];
  for (const file of selected) {
    try {
      const params = { owner, repo, path: file.filename };
      if (headSha) params.ref = headSha;

      const { data } = await octokit.repos.getContent(params);

      let content = '';
      if (data && !Array.isArray(data) && data.content && data.encoding === 'base64') {
        content = Buffer.from(data.content, 'base64').toString('utf8').slice(0, 20000);
      } else if (file.patch) {
        content = `// Patch for ${file.filename}\n${file.patch}`.slice(0, 20000);
      }

      if (content) {
        results.push({
          path: file.filename,
          content,
          language: guessLanguage(file.filename),
        });
      }
    } catch {
      if (file.patch) {
        results.push({
          path: file.filename,
          content: `// Patch for ${file.filename}\n${file.patch}`.slice(0, 20000),
          language: guessLanguage(file.filename),
        });
      }
    }
  }

  return results;
}

async function postPrReview(octokit, { owner, repo, pullNumber, summary, comments }) {
  const body = `## AI Code Review\n\n${summary}\n\n---\n_Automated review by AI Code Review Platform_`;

  // GitHub review comments require position/line on the diff; use line when possible
  const reviewComments = comments
    .filter((c) => c.path && c.line && c.body)
    .slice(0, 10)
    .map((c) => ({
      path: c.path,
      line: c.line,
      side: 'RIGHT',
      body: c.body,
    }));

  try {
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      event: 'COMMENT',
      body,
      comments: reviewComments.length ? reviewComments : undefined,
    });
  } catch (err) {
    // Fallback: summary-only comment if line comments fail (e.g. outdated lines)
    console.warn('Line comments failed, posting summary only:', err.message);
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body:
        body +
        (comments.length
          ? `\n\n### Findings\n${comments.map((c) => `- **${c.path}:${c.line}** — ${c.body}`).join('\n')}`
          : ''),
    });
  }
}

/**
 * Handle GitHub webhook — pull_request opened / synchronize / reopened
 */
const handleGithubWebhook = async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];
  const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body)));

  if (!verifyGithubSignature(rawBody, signature)) {
    return res.status(401).json({ message: 'Invalid webhook signature' });
  }

  let payload;
  try {
    payload = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
  } catch {
    return res.status(400).json({ message: 'Invalid JSON payload' });
  }

  // Always ack quickly for ping
  if (event === 'ping') {
    return res.json({ message: 'pong' });
  }

  if (event !== 'pull_request') {
    return res.json({ message: `Ignored event: ${event}` });
  }

  const action = payload.action;
  if (!['opened', 'synchronize', 'reopened'].includes(action)) {
    return res.json({ message: `Ignored action: ${action}` });
  }

  // Respond immediately; process async
  res.status(202).json({ message: 'PR review queued' });

  const owner = payload.repository?.owner?.login;
  const repo = payload.repository?.name;
  const pullNumber = payload.pull_request?.number;
  const installationId = payload.installation?.id;

  if (!owner || !repo || !pullNumber) return;

  try {
    // Prefer installation id from webhook when using GitHub App
    let octokit;
    if (process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY && installationId) {
      const auth = createAppAuth({
        appId: process.env.GITHUB_APP_ID,
        privateKey: process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n'),
        installationId,
      });
      const installationAuth = await auth({ type: 'installation' });
      octokit = new Octokit({ auth: installationAuth.token });
    } else {
      octokit = await getOctokit();
    }

    const headSha = payload.pull_request?.head?.sha;
    const files = await fetchPrFiles(octokit, owner, repo, pullNumber, headSha);
    if (!files.length) {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body: '## AI Code Review\n\nNo reviewable code files found in this PR.',
      });
      return;
    }

    const result = await analyzePullRequest({ owner, repo, pullNumber, files });

    await postPrReview(octokit, {
      owner,
      repo,
      pullNumber,
      summary: result.summary,
      comments: result.comments,
    });

    // Persist anonymously under a system placeholder if SYSTEM_USER_ID set
    if (process.env.SYSTEM_USER_ID) {
      await Review.create({
        user: process.env.SYSTEM_USER_ID,
        code: files.map((f) => `// ${f.path}\n${f.content}`).join('\n\n').slice(0, 100000),
        language: 'multifile',
        taskType: 'pr-review',
        githubUrl: payload.pull_request?.html_url,
        files,
        response: result.response,
      });
    }

    console.log(`PR review posted for ${owner}/${repo}#${pullNumber}`);
  } catch (err) {
    console.error('PR webhook processing failed:', err.message);
  }
};

/**
 * Manual trigger: POST /api/ai/pr-review { owner, repo, pullNumber }
 * Useful for demos without waiting for a webhook.
 */
const manualPrReview = async (req, res) => {
  try {
    const { owner, repo, pullNumber, url } = req.body;
    let o = owner;
    let r = repo;
    let n = Number(pullNumber);

    if (url) {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
      if (!match) {
        return res.status(400).json({ message: 'Invalid PR URL. Example: https://github.com/owner/repo/pull/1' });
      }
      o = match[1];
      r = match[2];
      n = Number(match[3]);
    }

    if (!o || !r || !n) {
      return res.status(400).json({ message: 'owner, repo, and pullNumber (or url) are required' });
    }

    const octokit = await getOctokit();
    const { data: pr } = await octokit.pulls.get({ owner: o, repo: r, pull_number: n });
    const files = await fetchPrFiles(octokit, o, r, n, pr.head?.sha);
    if (!files.length) {
      return res.status(400).json({ message: 'No reviewable files in this PR' });
    }

    const result = await analyzePullRequest({ owner: o, repo: r, pullNumber: n, files });

    const post = req.body.post !== false;
    if (post) {
      await postPrReview(octokit, {
        owner: o,
        repo: r,
        pullNumber: n,
        summary: result.summary,
        comments: result.comments,
      });
    }

    const review = await Review.create({
      user: req.user.id,
      code: files.map((f) => `// ${f.path}\n${f.content}`).join('\n\n').slice(0, 100000),
      language: 'multifile',
      taskType: 'pr-review',
      githubUrl: `https://github.com/${o}/${r}/pull/${n}`,
      files,
      response: result.response,
    });

    res.status(201).json({
      _id: review._id,
      taskType: 'pr-review',
      pr: `${o}/${r}#${n}`,
      posted: post,
      commentCount: result.comments.length,
      summary: result.summary,
      ...result.response,
    });
  } catch (error) {
    console.error('Manual PR review error:', error.message);
    res.status(500).json({ message: error.message || 'PR review failed' });
  }
};

module.exports = {
  handleGithubWebhook,
  manualPrReview,
  verifyGithubSignature,
};
