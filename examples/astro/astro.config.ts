import { defineConfig } from 'astro/config';
import { viteRuntimeWorkerd } from 'vite-runtime-workerd-plugin';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [viteRuntimeWorkerd()],
  }
});
