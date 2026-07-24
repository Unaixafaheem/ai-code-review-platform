import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="glass-btn flex h-9 w-9 items-center justify-center rounded-lg text-base transition hover:scale-105"
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
