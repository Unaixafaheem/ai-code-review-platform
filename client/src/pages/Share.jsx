import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/api';
import CodeEditor from '../components/CodeEditor';
import DiffViewer from '../components/DiffViewer';
import AIResponsePanel from '../components/AIResponsePanel';

export default function Share() {
  const { shareId } = useParams();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get(`/reviews/share/${shareId}`)
      .then(({ data }) => setReview(data))
      .catch((err) => setError(err.response?.data?.message || 'Shared review not found'))
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-primary">Link unavailable</h1>
        <p className="mt-2 text-sm text-muted">{error || 'This share link is invalid or was revoked.'}</p>
        <Link to="/dashboard" className="mt-6 inline-block text-sm text-accent hover:underline">
          Go to Dashboard →
        </Link>
      </div>
    );
  }

  const annotations = review.response?.annotations || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted">Shared review</p>
        <h1 className="text-2xl font-bold capitalize text-primary">{review.taskType} report</h1>
        <p className="mt-1 text-sm text-muted">
          {review.language} · {new Date(review.createdAt).toLocaleString()}
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Code</h2>
          <CodeEditor
            height="50vh"
            language={review.language === 'multifile' ? 'javascript' : review.language}
            value={review.code}
            readOnly
            annotations={annotations.filter((a) => !a.file)}
          />
        </div>
        <div className="h-[50vh]">
          <AIResponsePanel
            response={review.response}
            taskType={review.taskType}
            code={review.code}
            language={review.language}
          />
        </div>
      </div>

      {review.response?.improvedCode &&
        review.response.improvedCode !== review.code &&
        review.taskType !== 'github' && (
          <div className="mt-8">
            <DiffViewer
              original={review.code}
              modified={review.response.improvedCode}
              language={review.targetLanguage || review.language}
              height="40vh"
            />
          </div>
        )}
    </div>
  );
}
