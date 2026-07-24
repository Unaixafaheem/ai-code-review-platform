import { useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function CommentThread({ reviewId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!reviewId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/reviews/${reviewId}/comments`);
      setComments(data);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [reviewId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setError('');
    try {
      const { data } = await api.post(`/reviews/${reviewId}/comments`, { body });
      setComments((prev) => [...prev, data]);
      setBody('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post comment');
    }
  };

  const remove = async (commentId) => {
    try {
      await api.delete(`/reviews/${reviewId}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch {
      // ignore
    }
  };

  if (!reviewId) return null;

  return (
    <div className="glass-card rounded-xl border p-4">
      <h3 className="mb-3 text-sm font-semibold text-primary">Discussion</h3>
      {loading ? (
        <p className="text-xs text-muted">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="mb-3 text-xs text-muted">No comments yet — start the discussion.</p>
      ) : (
        <ul className="mb-4 max-h-48 space-y-3 overflow-y-auto">
          {comments.map((c) => (
            <li key={c._id} className="rounded-lg border border-border/60 bg-surface-raised/50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-primary">{c.user?.name || 'User'}</span>
                <span className="text-[10px] text-muted">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{c.body}</p>
              {String(c.user?._id) === String(user?._id) && (
                <button
                  type="button"
                  onClick={() => remove(c._id)}
                  className="mt-1 text-[10px] text-red-300 hover:underline"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment on this review…"
          className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary outline-none focus:border-accent"
        />
        <button type="submit" className="btn-primary rounded-lg px-3 py-2 text-sm">
          Post
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}
