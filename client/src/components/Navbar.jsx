import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const navLinkClass = ({ isActive }) =>
  `px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
    isActive
      ? 'bg-accent/20 text-accent'
      : 'text-muted hover:text-primary hover:bg-white/5'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b border-border/50 glass-card"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link to="/dashboard" className="group flex shrink-0 items-center gap-2 font-semibold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-sm text-white shadow-lg shadow-indigo-500/25 transition group-hover:scale-105">
            AI
          </span>
          <span className="hidden lg:inline">Code Review</span>
        </Link>

        {user && (
          <nav className="flex max-w-[55%] items-center gap-0.5 overflow-x-auto">
            <NavLink to="/dashboard" className={navLinkClass}>Review</NavLink>
            <NavLink to="/multifile" className={navLinkClass}>Files</NavLink>
            <NavLink to="/compare" className={navLinkClass}>Compare</NavLink>
            <NavLink to="/rules" className={navLinkClass}>Rules</NavLink>
            <NavLink to="/teams" className={navLinkClass}>Teams</NavLink>
            <NavLink to="/analytics" className={navLinkClass}>Usage</NavLink>
            <NavLink to="/audit" className={navLinkClass}>Audit</NavLink>
            <NavLink to="/github" className={navLinkClass}>GitHub</NavLink>
            <NavLink to="/pr-bot" className={navLinkClass}>PR Bot</NavLink>
            <NavLink to="/history" className={navLinkClass}>History</NavLink>
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {user?.quota && (
            <span className="hidden rounded-full border border-border px-2 py-0.5 text-[10px] text-muted sm:inline">
              {user.quota.plan === 'pro'
                ? 'Pro'
                : `${user.quota.remaining ?? 0}/${user.quota.limit ?? 20}`}
            </span>
          )}
          <ThemeToggle />
          {user ? (
            <>
              <span className="hidden text-sm text-muted xl:inline">{user.name}</span>
              <button
                onClick={handleLogout}
                className="glass-btn rounded-lg px-3 py-1.5 text-sm text-muted transition hover:text-primary"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-muted transition hover:text-primary">
                Login
              </Link>
              <Link to="/register" className="btn-primary rounded-lg px-3 py-1.5 text-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
