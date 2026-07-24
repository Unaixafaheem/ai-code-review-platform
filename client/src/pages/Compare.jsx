import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api/api';
import CodeEditor from '../components/CodeEditor';
import AIResponsePanel from '../components/AIResponsePanel';
import { DEFAULT_CODE, LANGUAGES } from '../constants/languages';
import { useAuth } from '../context/AuthContext';

export default function Compare() {
  const { refreshUser } = useAuth();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [reviewId, setReviewId] = useState(null);

  const run = async () => {
    setLoading(true);
    setError('');
    setResults([]);
    setReviewId(null);
    try {
      const { data } = await api.post('/ai/compare', { code, language });
      setResults(data.results || []);
      setReviewId(data._id);
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || 'Comparison failed — set both GROQ_API_KEY and OPENAI_API_KEY');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Compare Models</h1>
        <p className="text-sm text-muted">
          Run the same review through Groq and OpenAI — side-by-side quality, latency, and estimated cost
        </p>
      </motion.div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="glass-btn rounded-lg px-3 py-2 text-sm text-primary"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <button onClick={run} disabled={loading || !code.trim()} className="btn-primary ml-auto rounded-lg px-5 py-2 text-sm">
          {loading ? 'Comparing…' : 'Compare Groq vs OpenAI'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-6">
        <CodeEditor height="35vh" language={language} value={code} onChange={setCode} />
      </div>

      {results.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {results.map((r) => (
            <div key={r.provider} className="space-y-3">
              <div className="glass-card rounded-xl border p-4 text-sm">
                <h2 className="font-semibold capitalize text-primary">{r.provider}</h2>
                <p className="mt-1 text-xs text-muted">{r.model}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-muted">Latency</p>
                    <p className="font-mono text-primary">{r.latencyMs}ms</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-muted">Tokens</p>
                    <p className="font-mono text-primary">{r.tokensEst}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-muted">Est. cost</p>
                    <p className="font-mono text-primary">${r.estimatedCostUsd?.toFixed?.(5) ?? r.estimatedCostUsd}</p>
                  </div>
                </div>
                {r.error && <p className="mt-2 text-xs text-red-300">{r.error}</p>}
              </div>
              {r.response && (
                <div className="h-[40vh]">
                  <AIResponsePanel
                    response={r.response}
                    taskType="compare"
                    code={code}
                    language={language}
                    reviewId={reviewId}
                    meta={{
                      provider: r.provider,
                      model: r.model,
                      latencyMs: r.latencyMs,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
