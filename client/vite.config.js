import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function requireApiUrlPlugin() {
  return {
    name: 'require-vite-api-url',
    configResolved(config) {
      if (config.command !== 'build') return;
      const url = (process.env.VITE_API_URL || '').trim();
      if (!url || !/^https?:\/\//i.test(url)) {
        throw new Error(
          'VITE_API_URL is required for production builds. Example: https://ai-code-review-api.onrender.com/api'
        );
      }
      if (!url.includes('/api')) {
        throw new Error(
          'VITE_API_URL should end with /api (example: https://your-service.onrender.com/api)'
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), requireApiUrlPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
