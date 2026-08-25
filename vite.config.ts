import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({isSsrBuild}) => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Client output goes in dist/client, which is the ONLY directory the
      // Express server exposes. dist/server.cjs (the backend bundle, complete
      // with its sourcemap) used to sit alongside the client assets inside a
      // served dist/, so the entire backend was downloadable at /server.cjs.
      // The --ssr build passes its own --outDir and ignores this.
      outDir: 'dist/client',
      emptyOutDir: true,
      // Chunking applies to the browser build only. The SSR build emits a
      // single file for the prerenderer to import, and rollup rejects
      // manualChunks alongside that.
      rollupOptions: isSsrBuild
        ? {}
        : {
            output: {
              // Split the stable third-party code out of the app bundle. React
              // and the animation/icon libraries change far less often than our
              // own code, so they stay cached across deploys instead of being
              // re-downloaded whenever a page changes.
              manualChunks: {
                react: ['react', 'react-dom', 'react-router', 'react-router-dom'],
                motion: ['motion'],
                icons: ['lucide-react'],
              },
            },
          },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
