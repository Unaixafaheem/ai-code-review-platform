/**
 * POST JSON to an SSE endpoint and invoke callbacks for events.
 * events: { onToken, onStatus, onDone, onError }
 */
export async function streamSse(url, body, { onToken, onStatus, onDone, onError, signal } = {}) {
  const token = localStorage.getItem('token');
  const base = import.meta.env.VITE_API_URL || '/api';
  const endpoint = url.startsWith('http') ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let secrets;
    try {
      const err = await res.json();
      message = err.message || message;
      secrets = err.secrets;
    } catch {
      // ignore
    }
    const error = new Error(message);
    if (secrets) error.secrets = secrets;
    throw error;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = 'message';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() || '';

    for (const line of parts) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
        continue;
      }
      if (!line.startsWith('data:')) continue;

      const raw = line.slice(5).trim();
      if (!raw) continue;

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        continue;
      }

      if (currentEvent === 'token') onToken?.(data.token || '');
      else if (currentEvent === 'status') onStatus?.(data);
      else if (currentEvent === 'done') onDone?.(data);
      else if (currentEvent === 'error') onError?.(data.message || 'Stream error');
    }
  }
}

export function streamAnalyze(payload, handlers) {
  return streamSse('/ai/analyze/stream', payload, handlers);
}

export function streamMultifile(payload, handlers) {
  return streamSse('/ai/multifile/stream', payload, handlers);
}
