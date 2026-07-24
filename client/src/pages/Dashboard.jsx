import { useState } from 'react';
import { motion } from 'framer-motion';
import CodeEditor from '../components/CodeEditor';
import DiffViewer from '../components/DiffViewer';
import AIResponsePanel from '../components/AIResponsePanel';
import SecretWarning from '../components/SecretWarning';
import RunSandbox from '../components/RunSandbox';
import { streamAnalyze } from '../api/stream';
import { useAuth } from '../context/AuthContext';
import { scanSecretsClient } from '../utils/secretScan';
import api from '../api/api';
import {
  TASK_MODES,
  LANGUAGES,
  CONVERT_TARGETS,
  DEFAULT_CODE,
  DEFAULT_ERROR,
  DEFAULT_INSECURE_CODE,
} from '../constants/languages';

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [undoCode, setUndoCode] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [task, setTask] = useState('review');
  const [error, setError] = useState(DEFAULT_ERROR);
  const [targetLanguage, setTargetLanguage] = useState('typescript');
  const [response, setResponse] = useState(null);
  const [improvedCode, setImprovedCode] = useState(null);
  const [meta, setMeta] = useState(null);
  const [rulesApplied, setRulesApplied] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const [pendingSecrets, setPendingSecrets] = useState(null);

  const selectTask = (modeId) => {
    setTask(modeId);
    if (modeId === 'security') setCode(DEFAULT_INSECURE_CODE);
    if (modeId === 'debug') setCode(DEFAULT_CODE);
  };

  const runAnalyze = async (extra = {}) => {
    setLoading(true);
    setResponse(null);
    setImprovedCode(null);
    setShowDiff(false);
    setSubmitError('');
    setStreamingText('');
    setReviewId(null);
    setMeta(null);
    setRulesApplied([]);
    setUndoCode(null);
    setPendingSecrets(null);

    let sourceCode = code;
    if (extra.redactSecrets) {
      try {
        const { data } = await api.post('/ai/scan-secrets', { code });
        if (data.redacted) {
          sourceCode = data.redacted;
          setCode(data.redacted);
        }
      } catch {
        // continue
      }
    }

    const payload = { code: sourceCode, task, language, ...extra };
    if (task === 'debug') payload.error = error;
    if (task === 'convert') payload.targetLanguage = targetLanguage;

    try {
      await streamAnalyze(payload, {
        onToken: (token) => setStreamingText((prev) => prev + token),
        onDone: async (data) => {
          setResponse({
            explanation: data.explanation,
            fix: data.fix,
            improvedCode: data.improvedCode,
            bestPractices: data.bestPractices,
            complexity: data.complexity,
            annotations: data.annotations || [],
            issues: data.issues || [],
          });
          setImprovedCode(data.improvedCode);
          setShowDiff(!!data.improvedCode && data.improvedCode.trim() !== sourceCode.trim());
          setReviewId(data._id);
          setMeta(data.meta || null);
          setRulesApplied(data.rulesApplied || []);
          setStreamingText('');
          try { await refreshUser(); } catch { /* ignore */ }
        },
        onError: (message) => setSubmitError(message),
      });
    } catch (err) {
      if (err.secrets) setPendingSecrets(err.secrets);
      else setSubmitError(err.message || 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const local = scanSecretsClient(code);
    if (local.length) {
      setPendingSecrets(local);
      return;
    }
    await runAnalyze();
  };

  const applyFix = () => {
    if (!improvedCode) return;
    setUndoCode(code);
    setCode(improvedCode);
    setShowDiff(false);
  };

  const undoFix = () => {
    if (undoCode == null) return;
    setCode(undoCode);
    setUndoCode(null);
    if (improvedCode) setShowDiff(true);
  };

  const diffLanguage = task === 'convert' ? targetLanguage : language;
  const annotations = response?.annotations || [];
  const quota = user?.quota;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">AI Code Review</h1>
          <p className="text-sm text-muted">Streaming · scored issues · secret scan · sandbox · cache</p>
        </div>
        {quota && (
          <div className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted">
            {quota.plan === 'pro' ? (
              <span className="text-accent">Pro · unlimited</span>
            ) : (
              <span>Free · {quota.remaining}/{quota.limit} left today</span>
            )}
          </div>
        )}
      </motion.div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        {TASK_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => selectTask(mode.id)}
            className={`glass-card hover-lift rounded-xl border p-3 text-left transition ${task === mode.id ? 'task-active' : ''}`}
          >
            <span className="text-lg">{mode.icon}</span>
            <p className="mt-1 text-sm font-medium text-primary">{mode.label}</p>
            <p className="mt-0.5 text-xs text-muted">{mode.description}</p>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="glass-btn rounded-lg px-3 py-2 text-sm text-primary outline-none">
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </select>
        {task === 'convert' && (
          <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} className="glass-btn rounded-lg px-3 py-2 text-sm text-primary outline-none">
            {CONVERT_TARGETS.map((lang) => (
              <option key={lang.value} value={lang.value}>→ {lang.label}</option>
            ))}
          </select>
        )}
        {improvedCode && (
          <>
            <button type="button" onClick={applyFix} className="rounded-lg border border-green-500/40 bg-green-500/15 px-3 py-2 text-sm text-green-300">Apply fix</button>
            {undoCode != null && (
              <button type="button" onClick={undoFix} className="glass-btn rounded-lg px-3 py-2 text-sm text-muted">Undo</button>
            )}
          </>
        )}
        <button onClick={handleSubmit} disabled={loading || !code.trim()} className="btn-primary ml-auto rounded-lg px-5 py-2 text-sm">
          {loading ? 'Streaming…' : 'Submit'}
        </button>
      </div>

      <SecretWarning
        secrets={pendingSecrets}
        onRedact={() => runAnalyze({ redactSecrets: true })}
        onAcknowledge={() => runAnalyze({ acknowledgeSecrets: true })}
        onCancel={() => setPendingSecrets(null)}
      />

      {submitError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{submitError}</div>
      )}

      {task === 'debug' && (
        <div className="mb-4">
          <label className="mb-1.5 block text-sm text-muted">Error Message</label>
          <textarea value={error} onChange={(e) => setError(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 font-mono text-sm text-primary outline-none focus:border-accent" placeholder="Paste the error stack trace or message…" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Your Code</h2>
          <CodeEditor height="55vh" language={language} value={code} onChange={setCode} annotations={annotations} />
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">AI Response</h2>
          <div className="h-[55vh]">
            <AIResponsePanel response={response} loading={loading} streamingText={streamingText} taskType={task} code={code} language={language} reviewId={reviewId} meta={meta} rulesApplied={rulesApplied} />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <RunSandbox code={improvedCode || code} language={language} />
      </div>

      {showDiff && improvedCode && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <DiffViewer original={undoCode ?? code} modified={improvedCode} language={diffLanguage} height="45vh" />
        </motion.div>
      )}
    </div>
  );
}
