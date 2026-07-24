export default function SecretWarning({ secrets, onRedact, onAcknowledge, onCancel }) {
  if (!secrets?.length) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <p className="font-semibold">Potential secrets detected</p>
      <p className="mt-1 text-xs opacity-80">
        {secrets.map((s) => s.type).join(', ')} — redact before sending to AI, or acknowledge the risk.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRedact}
          className="rounded-lg bg-amber-500/30 px-3 py-1.5 text-xs font-medium"
        >
          Redact & continue
        </button>
        <button
          type="button"
          onClick={onAcknowledge}
          className="glass-btn rounded-lg px-3 py-1.5 text-xs"
        >
          Send anyway
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs text-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}
