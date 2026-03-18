import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          widget: path.resolve(__dirname, 'src/widget/main.tsx'),
          test: path.resolve(__dirname, 'widget_test.html'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            return chunkInfo.name === 'widget' ? '[name].js' : 'assets/[name]-[hash].js';
          },
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'main.css' && assetInfo.type === 'asset') return 'widget.css';
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
  };
});
