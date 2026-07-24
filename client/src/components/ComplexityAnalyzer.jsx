import { motion } from 'framer-motion';

function parseComplexity(text = '') {
  const timeMatch = text.match(/time[^:]*:?\s*(O\([^)]+\))/i);
  const spaceMatch = text.match(/space[^:]*:?\s*(O\([^)]+\))/i);
  const fallback = text.match(/O\([^)]+\)/g) || [];

  return {
    time: timeMatch?.[1] || fallback[0] || 'O(?)',
    space: spaceMatch?.[1] || fallback[1] || 'O(?)',
    raw: text,
  };
}

function ComplexityBadge({ label, value, color }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className={`rounded-xl border p-4 ${color}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
    </motion.div>
  );
}

export default function ComplexityAnalyzer({ complexity }) {
  if (!complexity) return null;

  const { time, space, raw } = parseComplexity(complexity);

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-300">
        Complexity Analyzer
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <ComplexityBadge
          label="Time Complexity"
          value={time}
          color="border-purple-500/30 bg-purple-500/10 text-purple-200"
        />
        <ComplexityBadge
          label="Space Complexity"
          value={space}
          color="border-blue-500/30 bg-blue-500/10 text-blue-200"
        />
      </div>
      {raw && (
        <p className="rounded-lg border border-border/50 bg-surface/30 p-3 font-mono text-xs leading-relaxed text-gray-400">
          {raw}
        </p>
      )}
    </div>
  );
}
