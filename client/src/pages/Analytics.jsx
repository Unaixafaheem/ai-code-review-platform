import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

function BarChart({ items, labelKey, valueKey, color = 'bg-accent' }) {
  const max = Math.max(1, ...items.map((i) => i[valueKey] || 0));
  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-xs text-muted">No data yet</p>}
      {items.map((item) => (
        <div key={item[labelKey]}>
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span className="capitalize">{item[labelKey]}</span>
            <span>{item[valueKey]}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full ${color}`}
              style={{ width: `${(item[valueKey] / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { user, upgrade, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/analytics/usage?days=30')
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async () => {
    await upgrade('pro');
    await refreshUser();
  };

  const handleDowngrade = async () => {
    await upgrade('free');
    await refreshUser();
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Usage Dashboard</h1>
        <p className="text-sm text-muted">Reviews, modes, languages, tokens — last {data?.days || 30} days</p>
      </motion.div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Reviews', value: data?.totals?.reviews || 0 },
          { label: 'Tokens (est.)', value: data?.totals?.tokens || 0 },
          { label: 'Avg latency', value: `${data?.totals?.avgLatencyMs || 0} ms` },
          {
            label: 'Quota',
            value:
              data?.quota?.plan === 'pro'
                ? 'Pro ∞'
                : `${data?.quota?.remaining ?? 0}/${data?.quota?.limit ?? 20}`,
          },
        ].map((card) => (
          <div key={card.label} className="glass-card rounded-xl border p-4">
            <p className="text-xs uppercase tracking-wider text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-primary">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 glass-card rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-primary">Plan: {user?.plan || data?.quota?.plan || 'free'}</h2>
            <p className="text-xs text-muted">
              Free tier: {data?.quota?.limit || 20} reviews/day · Pro: unlimited (demo upgrade)
            </p>
          </div>
          {user?.plan === 'pro' ? (
            <button type="button" onClick={handleDowngrade} className="glass-btn rounded-lg px-4 py-2 text-sm">
              Switch to Free
            </button>
          ) : (
            <button type="button" onClick={handleUpgrade} className="btn-primary rounded-lg px-4 py-2 text-sm">
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-xl border p-4">
          <h3 className="mb-4 text-sm font-semibold text-primary">Reviews / day</h3>
          <BarChart items={data?.byDay || []} labelKey="date" valueKey="count" />
        </div>
        <div className="glass-card rounded-xl border p-4">
          <h3 className="mb-4 text-sm font-semibold text-primary">Most-used modes</h3>
          <BarChart items={data?.byTask || []} labelKey="taskType" valueKey="count" color="bg-indigo-400" />
        </div>
        <div className="glass-card rounded-xl border p-4">
          <h3 className="mb-4 text-sm font-semibold text-primary">Languages</h3>
          <BarChart items={data?.byLanguage || []} labelKey="language" valueKey="count" color="bg-emerald-400" />
        </div>
        <div className="glass-card rounded-xl border p-4">
          <h3 className="mb-4 text-sm font-semibold text-primary">Tokens / day</h3>
          <BarChart items={data?.byDay || []} labelKey="date" valueKey="tokens" color="bg-amber-400" />
        </div>
      </div>
    </div>
  );
}
