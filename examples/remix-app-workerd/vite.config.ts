import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteRuntimeWorkerd } from 'vite-runtime-workerd-plugin';

export default defineConfig({
  plugins: [
    viteRuntimeWorkerd(),
    remix({
      runtime: 'workerd',
    }),
    tsconfigPaths(),
  ],
});
