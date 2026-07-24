const axios = require('axios');

// Judge0 language IDs (CE)
const LANGUAGE_IDS = {
  javascript: 63, // Node.js
  typescript: 74,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  go: 60,
  rust: 73,
};

/**
 * Execute code via Judge0 CE API (RapidAPI or self-hosted).
 * Env:
 *   JUDGE0_URL (default https://judge0-ce.p.rapidapi.com)
 *   JUDGE0_API_KEY (RapidAPI key) — optional for public instances
 *   JUDGE0_HOST (default judge0-ce.p.rapidapi.com)
 */
async function runInSandbox({
  source,
  language = 'javascript',
  stdin = '',
  expectedOutput,
}) {
  const baseUrl = (process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com').replace(/\/$/, '');
  const languageId = LANGUAGE_IDS[language] || LANGUAGE_IDS.javascript;

  if (!process.env.JUDGE0_API_KEY && baseUrl.includes('rapidapi')) {
    // Local fallback simulator when no Judge0 key — still useful for demos/tests
    return simulateLocal(source, language, stdin);
  }

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.JUDGE0_API_KEY) {
    headers['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY;
    headers['X-RapidAPI-Host'] = process.env.JUDGE0_HOST || 'judge0-ce.p.rapidapi.com';
  }

  const { data: created } = await axios.post(
    `${baseUrl}/submissions?base64_encoded=false&wait=true`,
    {
      source_code: source,
      language_id: languageId,
      stdin: stdin || '',
      expected_output: expectedOutput || null,
    },
    { headers, timeout: 30000 }
  );

  return {
    provider: 'judge0',
    status: created.status?.description || 'Unknown',
    stdout: created.stdout || '',
    stderr: created.stderr || '',
    compileOutput: created.compile_output || '',
    time: created.time,
    memory: created.memory,
    exitCode: created.exit_code,
    token: created.token,
  };
}

function simulateLocal(source, language, stdin) {
  // Extremely limited safe simulator for JS only — no eval of user code in process.
  // Returns a clear message that Judge0 is preferred for real execution.
  if (language !== 'javascript' && language !== 'typescript') {
    return {
      provider: 'simulator',
      status: 'Unavailable',
      stdout: '',
      stderr: `Sandbox simulator only supports JavaScript without JUDGE0_API_KEY. Set JUDGE0_API_KEY for ${language}.`,
      compileOutput: '',
      time: null,
      memory: null,
      exitCode: 1,
    };
  }

  // Detect trivial console.log string literals for demo purposes
  const logs = [];
  const re = /console\.log\(\s*(['"`])(.*?)\1\s*\)/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    logs.push(m[2]);
  }

  if (logs.length) {
    return {
      provider: 'simulator',
      status: 'Accepted (simulated)',
      stdout: logs.join('\n') + (stdin ? `\n[stdin ignored in simulator]` : ''),
      stderr: '',
      compileOutput: '',
      time: '0.001',
      memory: 1024,
      exitCode: 0,
      note: 'Simulated output from console.log string literals. Configure JUDGE0_API_KEY for real sandboxed execution.',
    };
  }

  return {
    provider: 'simulator',
    status: 'Skipped',
    stdout: '',
    stderr:
      'No JUDGE0_API_KEY configured. Simulator could not extract trivial console.log outputs. Set JUDGE0_API_KEY for real execution.',
    compileOutput: '',
    time: null,
    memory: null,
    exitCode: 1,
  };
}

module.exports = { runInSandbox, LANGUAGE_IDS, simulateLocal };
