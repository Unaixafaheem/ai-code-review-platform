import { useState } from 'react';
import api from '../api/api';

export default function ShareButton({ reviewId, existingShareId }) {
  const [shareUrl, setShareUrl] = useState(
    existingShareId ? `${window.location.origin}/share/${existingShareId}` : ''
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  if (!reviewId) return null;

  const createShare = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/reviews/${reviewId}/share`);
      const url = data.shareUrl || `${window.location.origin}/share/${data.shareId}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const copyAgain = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const revoke = async () => {
    setLoading(true);
    try {
      await api.delete(`/reviews/${reviewId}/share`);
      setShareUrl('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!shareUrl ? (
        <button
          type="button"
          onClick={createShare}
          disabled={loading}
          className="glass-btn rounded-lg px-3 py-1.5 text-xs text-muted transition hover:text-primary"
        >
          {loading ? 'Creating…' : 'Share'}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={copyAgain}
            className="glass-btn rounded-lg px-3 py-1.5 text-xs text-accent transition"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={revoke}
            disabled={loading}
            className="rounded-lg px-2 py-1.5 text-xs text-muted hover:text-red-300"
          >
            Revoke
          </button>
        </>
      )}
      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}
