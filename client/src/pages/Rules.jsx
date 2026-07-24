import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function Rules() {
  const { user } = useAuth();
  const [rules, setRules] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState('personal');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .get('/rules')
      .then(({ data }) => setRules(data))
      .catch(() => setRules([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { title, description };
      if (scope === 'team' && user?.activeTeam) {
        payload.teamId = user.activeTeam._id || user.activeTeam;
      }
      await api.post('/rules', payload);
      setTitle('');
      setDescription('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create rule');
    }
  };

  const toggle = async (rule) => {
    await api.patch(`/rules/${rule._id}`, { enabled: !rule.enabled });
    load();
  };

  const remove = async (id) => {
    await api.delete(`/rules/${id}`);
    load();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Review Rules</h1>
        <p className="text-sm text-muted">
          Custom style guides injected into every AI prompt (e.g. “prefer early returns”, “no any in TS”)
        </p>
      </motion.div>

      <form onSubmit={create} className="glass-card mb-6 space-y-3 rounded-xl border p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Rule title"
          className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary outline-none focus:border-accent"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          placeholder="Describe the rule the AI must follow…"
          className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary outline-none focus:border-accent"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="glass-btn rounded-lg px-3 py-2 text-sm text-primary"
          >
            <option value="personal">Personal</option>
            <option value="team">Active team (admin)</option>
          </select>
          <button type="submit" className="btn-primary ml-auto rounded-lg px-4 py-2 text-sm">
            Add rule
          </button>
        </div>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </form>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-muted">No rules yet. Add your first style guide.</p>
      ) : (
        <ul className="space-y-3">
          {rules.map((rule) => (
            <li key={rule._id} className="glass-card rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-primary">
                    {rule.title}
                    {!rule.enabled && <span className="ml-2 text-xs text-muted">(disabled)</span>}
                  </p>
                  <p className="mt-1 text-sm text-muted">{rule.description}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-wide text-muted">
                    {rule.team ? 'Team rule' : 'Personal'} · {rule.language || 'any'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => toggle(rule)} className="glass-btn rounded-lg px-2 py-1 text-xs">
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button type="button" onClick={() => remove(rule._id)} className="rounded-lg px-2 py-1 text-xs text-red-300">
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
