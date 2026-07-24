import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api/api';
import AIResponsePanel from '../components/AIResponsePanel';
import DownloadOutput from '../components/DownloadOutput';
import { SkeletonPanel } from '../components/Skeleton';

export default function GitHub() {
  const [url, setUrl] = useState('https://github.com/vercel/next.js');
  const [response, setResponse] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [useQueue, setUseQueue] = useState(true);
  const [jobId, setJobId] = useState(null);

  const pollJob = async (id) => {
    for (let i = 0; i < 60; i++) {
      const { data } = await api.get(`/jobs/${id}`);
      if (data.status === 'completed' && data.result) return data.result;
      if (data.status === 'failed') throw new Error(data.error || 'Job failed');
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error('Job timed out');
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResponse(null);
    setMeta(null);
    setError('');
    setJobId(null);

    try {
      if (useQueue) {
        const { data: queued } = await api.post('/ai/github/queue', { url });
        setJobId(queued.jobId);
        const data = await pollJob(queued.jobId);
        setResponse({
          explanation: data.explanation,
          fix: data.fix,
          improvedCode: data.improvedCode,
          bestPractices: data.bestPractices,
          complexity: data.complexity,
          issues: data.issues || [],
          annotations: data.annotations || [],
        });
        setMeta({
          repo: data.repo,
          stars: data.stars,
          languages: data.languages,
          cached: data.cached,
          mode: queued.mode,
        });
      } else {
        const { data } = await api.post('/ai/github', { url });
        setResponse({
          explanation: data.explanation,
          fix: data.fix,
          improvedCode: data.improvedCode,
          bestPractices: data.bestPractices,
          complexity: data.complexity,
        });
        setMeta({ repo: data.repo, stars: data.stars, languages: data.languages });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'GitHub analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl px-4 py-6 sm:px-6"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">GitHub Repo Analyzer</h1>
        <p className="mt-1 text-sm text-muted">
          Paste a public GitHub URL — AI returns architecture analysis, issues, and improvements
        </p>
      </div>

      <div className="glass-card gradient-border mb-6 rounded-xl p-6">
        <label className="mb-2 block text-sm text-muted">Repository URL</label>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-primary outline-none focus:border-accent"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
            className="btn-primary rounded-lg px-6 py-2.5 text-sm"
          >
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={useQueue} onChange={(e) => setUseQueue(e.target.checked)} />
          Queue via BullMQ/Redis (falls back to inline if Redis unset)
        </label>
        {jobId && <p className="mt-2 text-xs text-accent">Job: {jobId}</p>}
        {meta?.cached && <p className="mt-1 text-xs text-green-300">Served from cache</p>}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {meta && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 flex flex-wrap items-center gap-3"
        >
          <span className="glass-card rounded-full px-3 py-1 text-sm font-medium text-primary">
            {meta.repo}
          </span>
          <span className="text-sm text-muted">⭐ {meta.stars?.toLocaleString()}</span>
          {meta.languages?.map((l) => (
            <span key={l} className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
              {l}
            </span>
          ))}
          {response && (
            <DownloadOutput
              response={response}
              taskType="github"
              code={url}
              language="github"
            />
          )}
        </motion.div>
      )}

      <div className="min-h-[50vh]">
        {loading ? (
          <SkeletonPanel />
        ) : (
          <AIResponsePanel
            response={response}
            loading={false}
            taskType="github"
            code={url}
            language="github"
          />
        )}
      </div>
    </motion.div>
  );
}
