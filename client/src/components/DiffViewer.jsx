import { DiffEditor } from '@monaco-editor/react';

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 13,
  fontFamily: 'JetBrains Mono, Fira Code, monospace',
  readOnly: true,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  renderSideBySide: true,
};

export default function DiffViewer({ original, modified, language = 'javascript', height = '50vh' }) {
  if (!modified || original === modified) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Code Diff — Original vs Improved</h3>
        <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs text-indigo-300">
          Monaco Diff Mode
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <DiffEditor
          height={height}
          language={language}
          original={original}
          modified={modified}
          theme="vs-dark"
          options={editorOptions}
        />
      </div>
    </div>
  );
}
