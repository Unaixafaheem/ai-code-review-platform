import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import CodeEditor from '../components/CodeEditor';
import AIResponsePanel from '../components/AIResponsePanel';
import api from '../api/api';
import { streamMultifile } from '../api/stream';

const EXT_LANG = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  java: 'java',
  go: 'go',
  rs: 'rust',
  cpp: 'cpp',
  c: 'c',
  css: 'css',
  html: 'html',
  json: 'json',
  md: 'markdown',
};

function langFromPath(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  return EXT_LANG[ext] || 'plaintext';
}

export default function MultiFile() {
  const [files, setFiles] = useState([]);
  const [activePath, setActivePath] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState('');
  const [reviewId, setReviewId] = useState(null);

  const activeFile = useMemo(
    () => files.find((f) => f.path === activePath) || files[0],
    [files, activePath]
  );

  const annotations = useMemo(() => {
    const all = response?.annotations || [];
    if (!activeFile) return all.filter((a) => !a.file);
    return all.filter((a) => !a.file || a.file === activeFile.path || a.file.endsWith(activeFile.path));
  }, [response, activeFile]);

  const addFilesFromList = async (fileList) => {
    const next = [...files];
    for (const file of Array.from(fileList)) {
      if (file.name.toLowerCase().endsWith('.zip')) continue;
      const content = await file.text();
      const path = file.webkitRelativePath || file.name;
      if (next.some((f) => f.path === path)) continue;
      next.push({ path, content: content.slice(0, 30000), language: langFromPath(path) });
    }
    setFiles(next.slice(0, 20));
    if (!activePath && next[0]) setActivePath(next[0].path);
  };

  const handleZipUpload = async (file) => {
    if (!file) return;
    setError('');
    setLoading(true);
    setResponse(null);
    setStreamingText('');
    setReviewId(null);

    try {
      const form = new FormData();
      form.append('zip', file);
      const { data } = await api.post('/ai/multifile/zip', form);

      setResponse({
        explanation: data.explanation,
        fix: data.fix,
        improvedCode: data.improvedCode,
        bestPractices: data.bestPractices,
        complexity: data.complexity,
        annotations: data.annotations || [],
      });
      setReviewId(data._id);

      if (data.files?.length) {
        setFiles(
          data.files.map((f) => ({
            path: f.path,
            content: f.content || '// Content unavailable',
            language: f.language || 'plaintext',
          }))
        );
        setActivePath(data.files[0].path);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Zip analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!files.length) return;
    setLoading(true);
    setError('');
    setResponse(null);
    setStreamingText('');
    setReviewId(null);

    try {
      await streamMultifile(
        { files },
        {
          onToken: (token) => setStreamingText((prev) => prev + token),
          onDone: (data) => {
            setResponse({
              explanation: data.explanation,
              fix: data.fix,
              improvedCode: data.improvedCode,
              bestPractices: data.bestPractices,
              complexity: data.complexity,
              annotations: data.annotations || [],
            });
            setReviewId(data._id);
            setStreamingText('');
          },
          onError: (message) => setError(message),
        }
      );
    } catch (err) {
      setError(err.message || 'Multifile analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (path) => {
    const next = files.filter((f) => f.path !== path);
    setFiles(next);
    if (activePath === path) setActivePath(next[0]?.path || null);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Multi-file Project Review</h1>
        <p className="text-sm text-muted">
          Upload a zip or select multiple files for cross-file import, pattern, and coupling analysis
        </p>
      </motion.div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="glass-btn cursor-pointer rounded-lg px-3 py-2 text-sm text-primary">
          Select files
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFilesFromList(e.target.files)}
          />
        </label>
        <label className="glass-btn cursor-pointer rounded-lg px-3 py-2 text-sm text-primary">
          Upload .zip
          <input
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => handleZipUpload(e.target.files?.[0])}
          />
        </label>
        <button
          onClick={handleAnalyze}
          disabled={loading || files.length === 0}
          className="btn-primary ml-auto rounded-lg px-5 py-2 text-sm"
        >
          {loading ? 'Analyzing…' : `Review ${files.length || ''} file${files.length === 1 ? '' : 's'}`}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr_1fr]">
        <div className="glass-card max-h-[55vh] overflow-y-auto rounded-xl border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Files ({files.length}/20)
          </p>
          {files.length === 0 ? (
            <p className="text-xs text-muted">No files yet</p>
          ) : (
            <ul className="space-y-1">
              {files.map((f) => (
                <li key={f.path}>
                  <button
                    type="button"
                    onClick={() => setActivePath(f.path)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs ${
                      activeFile?.path === f.path
                        ? 'bg-accent/20 text-accent'
                        : 'text-muted hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{f.path}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(f.path);
                      }}
                      className="ml-2 text-muted hover:text-red-300"
                    >
                      ×
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="truncate text-sm font-semibold text-muted">
            {activeFile?.path || 'Preview'}
          </h2>
          <CodeEditor
            height="55vh"
            language={activeFile?.language || 'javascript'}
            value={activeFile?.content || '// Select or upload files to begin'}
            onChange={(val) => {
              if (!activeFile) return;
              setFiles((prev) =>
                prev.map((f) => (f.path === activeFile.path ? { ...f, content: val } : f))
              );
            }}
            annotations={annotations}
            readOnly={!activeFile}
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">AI Response</h2>
          <div className="h-[55vh]">
            <AIResponsePanel
              response={response}
              loading={loading}
              streamingText={streamingText}
              taskType="multifile"
              code={files.map((f) => `// ${f.path}\n${f.content}`).join('\n\n')}
              language="javascript"
              reviewId={reviewId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
