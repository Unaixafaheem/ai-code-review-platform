import { useState } from 'react';
import api from '../api/api';

export default function RunSandbox({ code, language = 'javascript' }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post('/ai/execute', {
        code,
        language,
        acknowledgeSecrets: true,
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-primary">Sandbox run</h3>
          <p className="text-xs text-muted">Execute via Judge0 (or local simulator)</p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading || !code?.trim()}
          className="btn-primary rounded-lg px-3 py-1.5 text-sm"
        >
          {loading ? 'Running…' : 'Run code'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      {result && (
        <div className="mt-3 space-y-2 text-xs">
          <p className="text-muted">
            {result.provider} · {result.status}
            {result.time != null && ` · ${result.time}s`}
          </p>
          {result.note && <p className="text-amber-200">{result.note}</p>}
          {result.stdout && (
            <pre className="overflow-x-auto rounded-lg bg-black/30 p-2 text-green-300">{result.stdout}</pre>
          )}
          {result.stderr && (
            <pre className="overflow-x-auto rounded-lg bg-black/30 p-2 text-red-300">{result.stderr}</pre>
          )}
        </div>
      )}
    </div>
  );
}
