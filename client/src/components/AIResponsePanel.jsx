import { motion } from 'framer-motion';
import ComplexityAnalyzer from './ComplexityAnalyzer';
import DownloadOutput from './DownloadOutput';
import ShareButton from './ShareButton';
import IssuesList from './IssuesList';
import { SkeletonPanel } from './Skeleton';

function Section({ title, children, accent = 'indigo' }) {
  const titleColors = {
    indigo: 'text-indigo-300',
    green: 'text-green-300',
    amber: 'text-amber-300',
    red: 'text-red-300',
    blue: 'text-blue-300',
  };

  const borderColors = {
    indigo: 'border-indigo-500/20',
    green: 'border-green-500/20',
    amber: 'border-amber-500/20',
    red: 'border-red-500/20',
    blue: 'border-blue-500/20',
  };

  return (
    <section>
      <h4 className={`mb-2 text-xs font-semibold uppercase tracking-wider ${titleColors[accent] || 'text-gray-500'}`}>
        {title}
      </h4>
      <div className={`glass-card rounded-lg border p-3 text-sm leading-relaxed text-muted ${borderColors[accent] || 'border-border'}`}>
        {children}
      </div>
    </section>
  );
}

const severityStyle = {
  error: 'border-red-500/40 bg-red-500/10 text-red-200',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  info: 'border-blue-500/40 bg-blue-500/10 text-blue-200',
};

export default function AIResponsePanel({
  response,
  loading,
  streamingText,
  taskType,
  code,
  language,
  reviewId,
  shareId,
  meta,
  rulesApplied,
}) {
  if (loading && !streamingText && !response) {
    return (
      <div className="h-full">
        <SkeletonPanel />
      </div>
    );
  }

  if (loading && streamingText) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-full flex-col overflow-hidden glass-card gradient-border"
      >
        <div className="flex items-center gap-2 border-b border-border/50 p-4">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          <h3 className="font-semibold text-primary">Streaming AI response…</h3>
        </div>
        <pre className="flex-1 overflow-y-auto whitespace-pre-wrap p-4 font-mono text-xs text-muted">
          {streamingText}
          <span className="animate-pulse">▍</span>
        </pre>
      </motion.div>
    );
  }

  if (!response) {
    return (
      <motion.div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border glass-card p-8 text-center">
        <div className="mb-3 text-3xl">🤖</div>
        <p className="text-sm font-medium text-primary">AI Analysis Panel</p>
        <p className="mt-1 max-w-xs text-xs text-muted">
          Select a mode, paste your code, and submit for structured AI analysis.
        </p>
      </motion.div>
    );
  }

  const isSecurity = taskType === 'security';
  const isDocs = taskType === 'docs';
  const isTest = taskType === 'test';
  const annotations = response.annotations || [];
  const issues = response.issues || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex h-full flex-col overflow-hidden glass-card gradient-border"
    >
      <div className="flex items-center justify-between border-b border-border/50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-primary">AI Response</h3>
          {taskType && (
            <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs capitalize text-accent">
              {taskType}
            </span>
          )}
          {meta?.provider && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
              {meta.provider}/{meta.model} · {meta.latencyMs}ms
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ShareButton reviewId={reviewId} existingShareId={shareId} />
          <DownloadOutput response={response} taskType={taskType} code={code} language={language} />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {rulesApplied?.length > 0 && (
          <p className="text-xs text-muted">Rules applied: {rulesApplied.join(' · ')}</p>
        )}

        <Section title="Explanation" accent="indigo">
          <p className="whitespace-pre-wrap">{response.explanation}</p>
        </Section>

        <Section
          title={isSecurity ? 'Security Findings' : isTest ? 'Test Strategy' : 'Fix'}
          accent={isSecurity ? 'red' : 'green'}
        >
          <p className="whitespace-pre-wrap">{response.fix}</p>
        </Section>

        <IssuesList issues={issues} />

        {annotations.length > 0 && issues.length === 0 && (
          <Section title="Line Annotations" accent="red">
            <ul className="space-y-2">
              {annotations.map((a, i) => (
                <li
                  key={`${a.line}-${i}`}
                  className={`rounded-lg border px-3 py-2 text-xs ${severityStyle[a.severity] || severityStyle.warning}`}
                >
                  <span className="font-mono font-semibold">
                    {a.file ? `${a.file}:` : ''}L{a.line}
                  </span>
                  <span className="mx-2 opacity-50">·</span>
                  <span className="uppercase tracking-wide opacity-70">{a.severity}</span>
                  <p className="mt-1 text-sm opacity-90">{a.message}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <ComplexityAnalyzer complexity={response.complexity} />

        <Section title="Best Practices" accent="amber">
          <p className="whitespace-pre-wrap">{response.bestPractices}</p>
        </Section>

        {(isDocs || isTest) && response.improvedCode && (
          <Section title={isTest ? 'Generated Tests' : 'Generated Documentation'} accent="blue">
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">{response.improvedCode}</pre>
          </Section>
        )}
      </div>
    </motion.div>
  );
}
