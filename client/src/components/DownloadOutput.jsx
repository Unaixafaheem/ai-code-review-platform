import { downloadMarkdown, downloadPDF } from '../utils/export';

export default function DownloadOutput({ response, taskType, code, language }) {
  if (!response) return null;

  return (
    <div className="flex gap-2">
      <button
        onClick={() => downloadMarkdown({ response, taskType, code, language })}
        className="glass-btn rounded-lg px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:text-white"
      >
        ↓ Markdown
      </button>
      <button
        onClick={() => downloadPDF({ response, taskType, code, language })}
        className="glass-btn rounded-lg px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:text-white"
      >
        ↓ PDF
      </button>
    </div>
  );
}
