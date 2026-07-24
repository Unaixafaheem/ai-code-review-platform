import { describe, it, expect } from 'vitest';
import { scanSecretsClient, hasSecrets } from '../utils/secretScan';

describe('secretScan client', () => {
  it('detects openai keys', () => {
    const findings = scanSecretsClient('const k="sk-abcdefghijklmnopqrstuvwxyz12"');
    expect(findings.some((f) => f.type === 'openai_key')).toBe(true);
    expect(hasSecrets('const k="sk-abcdefghijklmnopqrstuvwxyz12"')).toBe(true);
  });

  it('returns false for clean code', () => {
    expect(hasSecrets('function add(a,b){return a+b}')).toBe(false);
  });
});
