import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteRuntimeWorkerd } from 'vite-runtime-workerd-plugin';

export default defineConfig({
  ssr: {
    noExternal: true,
    target: 'webworker',
    resolve: {
      externalConditions: ['workerd', 'worker'],
    },
    optimizeDeps: {
      // Add CJS dependencies that break code in workerd
      // with errors like "require/module/exports is not defined":
      include: [
        // React deps:
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/server',
        // Remix deps:
        'set-cookie-parser',
        'cookie',
        '@remix-run/react/dist/esm/index.js',
      ],
    },
  },
  plugins: [
    viteRuntimeWorkerd(),
    remix({
      runtime: 'workerd',
    }),
    tsconfigPaths(),
  ],
});
