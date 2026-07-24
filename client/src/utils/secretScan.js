/**
 * Client-side mirror of common secret patterns for pre-submit warnings.
 */
const PATTERNS = [
  { type: 'openai_key', regex: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { type: 'groq_key', regex: /\bgsk_[A-Za-z0-9]{20,}\b/g },
  { type: 'github_pat', regex: /\bghp_[A-Za-z0-9]{36,}\b/g },
  { type: 'aws_access_key', regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { type: 'private_key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { type: 'stripe_key', regex: /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
];

export function scanSecretsClient(code = '') {
  const findings = [];
  for (const { type, regex } of PATTERNS) {
    const re = new RegExp(regex.source, regex.flags);
    if (re.test(code)) findings.push({ type });
  }
  return findings;
}

export function hasSecrets(code) {
  return scanSecretsClient(code).length > 0;
}
