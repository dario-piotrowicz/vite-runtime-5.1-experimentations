import {
  vitePlugin as remix,
  cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- TODO: fix the types in the vite-runtime-workerd-plugin
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
    remixCloudflareDevProxy(),
    remix(),
    tsconfigPaths(),
  ],
});