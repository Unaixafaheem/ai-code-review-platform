const { scanSecrets, redactSecrets } = require('../services/secretScanner');

describe('secretScanner', () => {
  test('detects OpenAI-style keys', () => {
    const code = 'const key = "sk-abcdefghijklmnopqrstuvwxyz123456";';
    const findings = scanSecrets(code);
    expect(findings.some((f) => f.type === 'openai_key')).toBe(true);
  });

  test('detects GitHub PATs', () => {
    const code = 'token = ghp_abcdefghijklmnopqrstuvwxyzABCDEFGHIJ';
    const findings = scanSecrets(code);
    expect(findings.some((f) => f.type === 'github_pat')).toBe(true);
  });

  test('redacts secrets', () => {
    const code = 'apiKey: "sk-abcdefghijklmnopqrstuvwxyz123456"';
    const { redacted, findings } = redactSecrets(code);
    expect(findings.length).toBeGreaterThan(0);
    expect(redacted).toContain('REDACTED');
    expect(redacted).not.toContain('sk-abcdefghijklmnopqrstuvwxyz123456');
  });

  test('returns empty for clean code', () => {
    expect(scanSecrets('function add(a,b){return a+b}')).toEqual([]);
  });
});
