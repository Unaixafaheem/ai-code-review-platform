export default function GlassCard({ children, className = '', hover = true, gradient = false }) {
  return (
    <div
      className={`glass-card rounded-xl ${gradient ? 'gradient-border' : ''} ${hover ? 'hover-lift' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
