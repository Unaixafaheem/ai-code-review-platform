import { useState } from 'react';
import { motion } from 'framer-motion';
import CodeEditor from '../components/CodeEditor';
import { LANGUAGES, DEFAULT_CODE } from '../constants/languages';

export default function EditorPage() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState('javascript');

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Full-Screen Editor</h1>
          <p className="text-sm text-gray-400">
            Focused coding environment — submit from the Dashboard when ready
          </p>
        </div>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </motion.div>

      <CodeEditor
        height="calc(100vh - 12rem)"
        language={language}
        value={code}
        onChange={setCode}
      />
    </div>
  );
}
