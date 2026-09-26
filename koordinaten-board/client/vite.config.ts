import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Im Dev-Modus läuft der Server separat auf :3000 – Vite leitet API, Medien und WebSocket weiter.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/medien': 'http://localhost:3000',
      '/ws': { target: 'ws://localhost:3000', ws: true },
    },
  },
});
