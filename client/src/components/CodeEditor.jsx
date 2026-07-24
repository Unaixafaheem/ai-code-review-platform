import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Fira Code, monospace',
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on',
  padding: { top: 12 },
};

const SEVERITY_MAP = {
  error: 8, // monaco.MarkerSeverity.Error
  warning: 4, // Warning
  info: 2, // Info
};

export default function CodeEditor({
  value,
  onChange,
  language = 'javascript',
  height = '60vh',
  readOnly = false,
  annotations = [],
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const applyMarkers = (editor, monaco, notes) => {
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    const markers = (notes || [])
      .filter((a) => a && Number(a.line) > 0)
      .map((a) => ({
        startLineNumber: Number(a.line),
        startColumn: 1,
        endLineNumber: Number(a.line),
        endColumn: model.getLineMaxColumn(Number(a.line)) || 1,
        message: a.message || 'Issue',
        severity: SEVERITY_MAP[a.severity] ?? SEVERITY_MAP.warning,
      }));

    monaco.editor.setModelMarkers(model, 'ai-review', markers);
  };

  useEffect(() => {
    applyMarkers(editorRef.current, monacoRef.current, annotations);
  }, [annotations, value]);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(val) => onChange?.(val ?? '')}
        theme="vs-dark"
        options={{ ...editorOptions, readOnly, glyphMargin: true }}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          monacoRef.current = monaco;
          applyMarkers(editor, monaco, annotations);
        }}
      />
    </div>
  );
}
