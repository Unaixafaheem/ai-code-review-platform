export const TASK_MODES = [
  { id: 'review', label: 'Code Review', description: 'Full AI code review', icon: '🔍' },
  { id: 'debug', label: 'Bug Fix', description: 'Explain & fix errors', icon: '🐛' },
  { id: 'optimize', label: 'Optimize', description: 'Performance improvements', icon: '⚡' },
  { id: 'explain', label: 'Explain', description: 'Beginner-friendly walkthrough', icon: '📖' },
  { id: 'convert', label: 'Convert', description: 'JS → TS, Python, etc.', icon: '🔄' },
  { id: 'security', label: 'Security Scan', description: 'XSS, SQL injection, unsafe patterns', icon: '🛡️' },
  { id: 'docs', label: 'Docs Generator', description: 'Auto README & function docs', icon: '📝' },
  { id: 'test', label: 'Generate Tests', description: 'Jest / Pytest unit tests', icon: '🧪' },
  { id: 'refactor', label: 'Refactor', description: 'Naming + extract helpers', icon: '✨' },
];

export const CONVERT_TARGETS = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'cpp', label: 'C++' },
];

export const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
];

export const DEFAULT_CODE = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Review this — exponential time complexity
console.log(fibonacci(40));
`;

export const DEFAULT_ERROR = `RangeError: Maximum call stack size exceeded
    at fibonacci (app.js:2:10)
    at fibonacci (app.js:3:10)`;

export const DEFAULT_INSECURE_CODE = `const express = require('express');
const app = express();

app.get('/user', (req, res) => {
  const query = "SELECT * FROM users WHERE id = " + req.query.id;
  db.query(query);
  res.send(req.query.name); // reflected XSS
});

app.post('/run', (req, res) => {
  eval(req.body.code);
  res.json({ ok: true });
});`;
