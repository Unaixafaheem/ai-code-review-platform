import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function Teams() {
  const { user, refreshUser } = useAuth();
  const [teams, setTeams] = useState([]);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .get('/teams')
      .then(({ data }) => setTeams(data))
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/teams', { name });
      setName('');
      await refreshUser();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team');
    }
  };

  const join = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/teams/join', { inviteCode });
      setInviteCode('');
      await refreshUser();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid invite code');
    }
  };

  const activate = async (id) => {
    await api.post(`/teams/${id}/activate`);
    await refreshUser();
  };

  const clearActive = async () => {
    await api.delete('/teams/active');
    await refreshUser();
  };

  const regen = async (id) => {
    await api.post(`/teams/${id}/invite`);
    load();
  };

  const activeId = user?.activeTeam?._id || user?.activeTeam;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Teams & Workspaces</h1>
        <p className="text-sm text-muted">
          Invite teammates, share review history, and apply team style rules (admin / member roles)
        </p>
        {activeId && (
          <p className="mt-2 text-xs text-accent">
            Active workspace: {user.activeTeam?.name || activeId}{' '}
            <button type="button" onClick={clearActive} className="ml-2 underline">
              Clear
            </button>
          </p>
        )}
      </motion.div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <form onSubmit={create} className="glass-card space-y-3 rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-primary">Create team</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Team name"
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary outline-none focus:border-accent"
          />
          <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm">
            Create
          </button>
        </form>

        <form onSubmit={join} className="glass-card space-y-3 rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-primary">Join with invite code</h2>
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
            placeholder="Invite code"
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 font-mono text-sm text-primary outline-none focus:border-accent"
          />
          <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm">
            Join
          </button>
        </form>
      </div>

      {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-muted">You are not in any team yet.</p>
      ) : (
        <ul className="space-y-4">
          {teams.map((team) => (
            <li key={team._id} className="glass-card rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-primary">{team.name}</h3>
                  <p className="text-xs text-muted">/{team.slug}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => activate(team._id)}
                    className={`rounded-lg px-3 py-1.5 text-xs ${
                      String(activeId) === String(team._id)
                        ? 'bg-accent/20 text-accent'
                        : 'glass-btn text-muted'
                    }`}
                  >
                    {String(activeId) === String(team._id) ? 'Active' : 'Set active'}
                  </button>
                  <button
                    type="button"
                    onClick={() => regen(team._id)}
                    className="glass-btn rounded-lg px-3 py-1.5 text-xs"
                  >
                    New invite
                  </button>
                </div>
              </div>
              <p className="mt-3 font-mono text-xs text-accent">Invite: {team.inviteCode}</p>
              <ul className="mt-3 space-y-1">
                {team.members?.map((m) => (
                  <li key={m.user?._id || m.user} className="flex justify-between text-xs text-muted">
                    <span>{m.user?.name || m.user}</span>
                    <span className="uppercase">{m.role}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
