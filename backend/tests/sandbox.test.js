const { simulateLocal } = require('../services/sandboxService');

describe('sandboxService simulator', () => {
  test('extracts console.log string outputs', () => {
    const result = simulateLocal(
      'console.log("hello");\nconsole.log(`world`);',
      'javascript',
      ''
    );
    expect(result.provider).toBe('simulator');
    expect(result.stdout).toContain('hello');
    expect(result.exitCode).toBe(0);
  });

  test('rejects unsupported language without Judge0', () => {
    const result = simulateLocal('print(1)', 'python', '');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/JUDGE0/i);
  });
});
