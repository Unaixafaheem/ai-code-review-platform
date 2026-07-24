const path = require('path');
const AdmZip = require('adm-zip');

const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.java', '.go', '.rs', '.cpp', '.cc', '.c', '.h', '.hpp',
  '.cs', '.rb', '.php', '.swift', '.kt', '.vue', '.svelte',
  '.css', '.scss', '.html', '.json', '.yml', '.yaml', '.md', '.sql', '.txt',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'vendor', '__pycache__',
]);

function guessLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.c': 'c',
    '.rb': 'ruby',
    '.php': 'php',
    '.css': 'css',
    '.html': 'html',
    '.json': 'json',
    '.md': 'markdown',
  };
  return map[ext] || 'plaintext';
}

function shouldInclude(entryName) {
  const parts = entryName.split(/[/\\]/);
  if (parts.some((p) => SKIP_DIRS.has(p) || p.startsWith('.'))) return false;
  const ext = path.extname(entryName).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

/**
 * Multer middleware helper: extract uploaded zip into req.extractedFiles
 */
function extractZipMiddleware(req, _res, next) {
  try {
    if (!req.file) return next();

    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();
    const files = [];

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const name = entry.entryName.replace(/\\/g, '/');
      if (!shouldInclude(name)) continue;

      let content;
      try {
        content = entry.getData().toString('utf8');
      } catch {
        continue;
      }

      if (!content || content.includes('\u0000')) continue;

      files.push({
        path: name.replace(/^[^/]+\//, ''), // strip top-level folder if present
        content: content.slice(0, 30000),
        language: guessLanguage(name),
      });

      if (files.length >= 20) break;
    }

    // Prefer paths as stored if stripping emptied them
    req.extractedFiles = files.map((f) => ({
      ...f,
      path: f.path || path.basename(f.path),
    }));

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { extractZipMiddleware, guessLanguage, shouldInclude };
