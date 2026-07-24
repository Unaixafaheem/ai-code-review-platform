import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api/api';

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/audit?limit=80')
      .then(({ data }) => setLogs(data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Audit Log</h1>
        <p className="text-sm text-muted">Who reviewed what, when — team-visible activity trail</p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted">No audit events yet. Run an analysis to populate this log.</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log._id} className="glass-card rounded-xl border px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-primary">{log.action}</span>
                <span className="text-xs text-muted">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {log.actor?.name || 'User'}
                {log.team?.name ? ` · ${log.team.name}` : ''}
                {log.resourceId ? ` · ${log.resourceType}:${String(log.resourceId).slice(-6)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
