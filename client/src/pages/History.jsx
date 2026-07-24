import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/api';
import DiffViewer from '../components/DiffViewer';
import AIResponsePanel from '../components/AIResponsePanel';
import ShareButton from '../components/ShareButton';
import CommentThread from '../components/CommentThread';

const TASK_LABELS = {
  review: { label: 'Code Review', icon: '🔍', color: 'bg-indigo-500/20 text-indigo-300' },
  debug: { label: 'Bug Fix', icon: '🐛', color: 'bg-red-500/20 text-red-300' },
  optimize: { label: 'Optimize', icon: '⚡', color: 'bg-amber-500/20 text-amber-300' },
  explain: { label: 'Explain', icon: '📖', color: 'bg-blue-500/20 text-blue-300' },
  convert: { label: 'Convert', icon: '🔄', color: 'bg-green-500/20 text-green-300' },
  github: { label: 'GitHub', icon: '🐙', color: 'bg-purple-500/20 text-purple-300' },
  security: { label: 'Security', icon: '🛡️', color: 'bg-red-500/20 text-red-300' },
  docs: { label: 'Docs', icon: '📝', color: 'bg-blue-500/20 text-blue-300' },
  multifile: { label: 'Multi-file', icon: '📁', color: 'bg-cyan-500/20 text-cyan-300' },
  'pr-review': { label: 'PR Review', icon: '🤖', color: 'bg-pink-500/20 text-pink-300' },
  test: { label: 'Tests', icon: '🧪', color: 'bg-teal-500/20 text-teal-300' },
  refactor: { label: 'Refactor', icon: '✨', color: 'bg-violet-500/20 text-violet-300' },
  compare: { label: 'Compare', icon: '⚖️', color: 'bg-yellow-500/20 text-yellow-300' },
};

function TaskBadge({ taskType }) {
  const task = TASK_LABELS[taskType] || { label: taskType, icon: '📄', color: 'bg-gray-500/20 text-gray-300' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${task.color}`}>
      {task.icon} {task.label}
    </span>
  );
}

export default function History() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api
      .get('/reviews')
      .then(({ data }) => setReviews(data))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  const openDetail = async (id) => {
    if (selected === id) {
      setSelected(null);
      setDetail(null);
      return;
    }

    setSelected(id);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/reviews/${id}`);
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Review History</h1>
        <p className="mt-1 text-sm text-gray-400">
          Past analyses — open a row to view details or create a share link
        </p>
      </motion.div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-gray-400">No reviews yet</p>
          <Link
            to="/dashboard"
            className="mt-3 inline-block text-sm text-indigo-400 hover:text-indigo-300"
          >
            Submit your first analysis →
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {reviews.map((review, i) => (
            <li key={review._id}>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => openDetail(review._id)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  selected === review._id
                    ? 'border-indigo-500 bg-indigo-500/5'
                    : 'border-border bg-surface-raised hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TaskBadge taskType={review.taskType} />
                    <span className="text-sm capitalize text-gray-400">{review.language}</span>
                    {review.shareId && (
                      <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] text-green-300">
                        Shared
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(review.createdAt).toLocaleString()}
                  </span>
                </div>
                {review.response?.explanation && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                    {review.response.explanation}
                  </p>
                )}
              </motion.button>

              <AnimatePresence>
                {selected === review._id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-4 rounded-xl border border-border bg-surface-raised p-4">
                      {detailLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                        </div>
                      ) : detail ? (
                        <>
                          <div className="flex justify-end">
                            <ShareButton reviewId={detail._id} existingShareId={detail.shareId} />
                          </div>
                          <div className="h-[40vh]">
                            <AIResponsePanel
                              response={detail.response}
                              taskType={detail.taskType}
                              code={detail.code}
                              language={detail.language}
                              reviewId={detail._id}
                              shareId={detail.shareId}
                            />
                          </div>
                          {detail.response?.improvedCode && detail.response.improvedCode !== detail.code && (
                            <DiffViewer
                              original={detail.code}
                              modified={detail.response.improvedCode}
                              language={detail.targetLanguage || detail.language}
                              height="35vh"
                            />
                          )}
                          <CommentThread reviewId={detail._id} />
                        </>
                      ) : (
                        <p className="py-4 text-center text-sm text-gray-500">Failed to load details</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
