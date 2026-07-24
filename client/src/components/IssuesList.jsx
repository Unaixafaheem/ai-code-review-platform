const severityStyle = {
  critical: 'border-red-500/50 bg-red-500/15 text-red-200',
  high: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  low: 'border-blue-500/40 bg-blue-500/10 text-blue-200',
};

export default function IssuesList({ issues = [] }) {
  if (!issues.length) return null;

  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-300">
        Scored Issues
      </h4>
      <ul className="space-y-2">
        {issues.map((issue, i) => (
          <li
            key={`${issue.line}-${i}`}
            className={`rounded-lg border px-3 py-2 text-xs ${severityStyle[issue.severity] || severityStyle.medium}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-black/20 px-1.5 py-0.5 font-mono uppercase">
                {issue.severity}
              </span>
              <span className="font-mono">L{issue.line}</span>
              {issue.category && (
                <span className="opacity-70">{issue.category}</span>
              )}
              <span className="ml-auto font-semibold">{issue.confidence}% conf.</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-current opacity-70"
                style={{ width: `${Math.min(100, issue.confidence || 0)}%` }}
              />
            </div>
            <p className="mt-1.5 text-sm opacity-90">{issue.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
