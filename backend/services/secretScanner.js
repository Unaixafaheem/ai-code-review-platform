/**
 * Detect common secrets/API keys in pasted source before sending to AI.
 */

const PATTERNS = [
  { type: 'aws_access_key', regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { type: 'aws_secret', regex: /aws(.{0,20})?(secret|access)?.{0,20}?['\"][0-9a-zA-Z\/+=]{40}['\"]/gi },
  { type: 'github_pat', regex: /\bghp_[A-Za-z0-9]{36,}\b/g },
  { type: 'github_fine_grained', regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { type: 'openai_key', regex: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { type: 'groq_key', regex: /\bgsk_[A-Za-z0-9]{20,}\b/g },
  { type: 'stripe_key', regex: /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { type: 'google_api', regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g },
  { type: 'slack_token', regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { type: 'jwt', regex: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g },
  { type: 'private_key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { type: 'generic_secret_assign', regex: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['\"][^'\"]{12,}['\"]/gi },
];

function scanSecrets(code = '') {
  const findings = [];
  const seen = new Set();

  for (const { type, regex } of PATTERNS) {
    const re = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = re.exec(code)) !== null) {
      const value = match[0];
      const key = `${type}:${match.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        type,
        index: match.index,
        preview: `${value.slice(0, 6)}…${value.slice(-4)}`,
        length: value.length,
      });
    }
  }

  return findings;
}

function redactSecrets(code = '') {
  let redacted = code;
  const findings = scanSecrets(code);

  // Apply longer matches first to avoid partial overwrites
  const sorted = [...findings].sort((a, b) => b.length - a.length);
  for (const f of sorted) {
    for (const { type, regex } of PATTERNS) {
      if (type !== f.type) continue;
      redacted = redacted.replace(new RegExp(regex.source, regex.flags), `[REDACTED_${type.toUpperCase()}]`);
    }
  }

  return { redacted, findings: scanSecrets(code) };
}

/**
 * Express middleware: scan req.body.code (and files[].content).
 * - If secrets found and redactSecrets !== true and acknowledgeSecrets !== true → 400
 * - If redactSecrets === true → replace body code with redacted version
 */
function secretScanMiddleware(req, res, next) {
  try {
    const acknowledge = req.body?.acknowledgeSecrets === true;
    const doRedact = req.body?.redactSecrets === true;

    let code = req.body?.code || '';
    if (Array.isArray(req.body?.files)) {
      code += '\n' + req.body.files.map((f) => f.content || '').join('\n');
    }

    const findings = scanSecrets(code);
    if (!findings.length) return next();

    if (doRedact) {
      if (req.body.code) {
        req.body.code = redactSecrets(req.body.code).redacted;
      }
      if (Array.isArray(req.body.files)) {
        req.body.files = req.body.files.map((f) => ({
          ...f,
          content: redactSecrets(f.content || '').redacted,
        }));
      }
      req.secretFindings = findings;
      req.secretsRedacted = true;
      return next();
    }

    if (acknowledge) {
      req.secretFindings = findings;
      return next();
    }

    return res.status(400).json({
      message: 'Potential secrets detected in code. Acknowledge or redact before analyzing.',
      secrets: findings,
      code: 'SECRETS_DETECTED',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { scanSecrets, redactSecrets, secretScanMiddleware, PATTERNS };
