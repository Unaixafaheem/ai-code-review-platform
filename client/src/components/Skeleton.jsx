export function SkeletonLine({ width = '100%', height = '1rem', className = '' }) {
  return (
    <div
      className={`skeleton rounded-md ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonPanel() {
  return (
    <div className="glass-card space-y-4 rounded-xl p-6">
      <SkeletonLine width="40%" height="1.25rem" />
      <SkeletonLine />
      <SkeletonLine />
      <SkeletonLine width="75%" />
      <div className="pt-2">
        <SkeletonLine width="30%" height="1rem" />
        <div className="mt-3 space-y-2">
          <SkeletonLine />
          <SkeletonLine width="90%" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card rounded-xl p-4">
      <SkeletonLine width="50%" height="1rem" />
      <SkeletonLine width="80%" height="0.75rem" className="mt-2" />
    </div>
  );
}
