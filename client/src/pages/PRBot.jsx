import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api/api';
import AIResponsePanel from '../components/AIResponsePanel';

export default function PRBot() {
  const [url, setUrl] = useState('');
  const [post, setPost] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await api.post('/ai/pr-review', { url, post });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'PR review failed. Check GitHub token / App credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-primary">GitHub PR Review Bot</h1>
        <p className="mt-1 text-sm text-muted">
          Trigger an AI review on a pull request — posts line comments for bugs, security, and style.
          Webhook endpoint: <code className="text-accent">POST /api/webhooks/github</code>
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="glass-card space-y-4 rounded-xl border p-5">
        <div>
          <label className="mb-1.5 block text-sm text-muted">Pull request URL</label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/12"
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary outline-none focus:border-accent"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={post}
            onChange={(e) => setPost(e.target.checked)}
            className="rounded"
          />
          Post review comments on GitHub
        </label>

        <button type="submit" disabled={loading || !url.trim()} className="btn-primary rounded-lg px-5 py-2 text-sm">
          {loading ? 'Reviewing PR…' : 'Run AI PR review'}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-4">
          <div className="glass-card rounded-xl border p-4 text-sm text-muted">
            <p>
              <span className="text-primary">PR:</span> {result.pr}
            </p>
            <p>
              <span className="text-primary">Posted:</span> {result.posted ? 'Yes' : 'No (dry run)'}
            </p>
            <p>
              <span className="text-primary">Comments:</span> {result.commentCount}
            </p>
            {result.summary && (
              <p className="mt-2 whitespace-pre-wrap">{result.summary}</p>
            )}
          </div>

          <div className="h-[45vh]">
            <AIResponsePanel
              response={{
                explanation: result.explanation,
                fix: result.fix,
                improvedCode: result.improvedCode,
                bestPractices: result.bestPractices,
                complexity: result.complexity,
                annotations: result.annotations || [],
              }}
              taskType="pr-review"
              reviewId={result._id}
            />
          </div>
        </div>
      )}

      <div className="mt-10 glass-card rounded-xl border p-5 text-sm text-muted">
        <h2 className="mb-2 font-semibold text-primary">Setup (GitHub App)</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Create a GitHub App with Pull Requests: Read & write, Contents: Read</li>
          <li>Subscribe to <code className="text-accent">pull_request</code> webhooks</li>
          <li>Webhook URL: <code className="text-accent">https://YOUR-API/api/webhooks/github</code></li>
          <li>
            Set env: <code>GITHUB_APP_ID</code>, <code>GITHUB_PRIVATE_KEY</code>,{' '}
            <code>GITHUB_WEBHOOK_SECRET</code> (or use <code>GITHUB_TOKEN</code> for manual reviews)
          </li>
        </ol>
      </div>
    </div>
  );
}
