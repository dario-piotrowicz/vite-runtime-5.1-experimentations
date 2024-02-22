import { defineConfig } from 'tsup';

// build in two steps to export worker entry script as string

/**
 * This configuration is for building the "client", which can then be
 * used by the plugin
 */
const buildClientConfig = defineConfig({
  entry: ['src/client/index.ts'],
  outDir: 'dist/client',
  format: ['esm'],
  platform: 'browser',
  noExternal: [/.*/],
});

const buildPluginConfig = defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['cjs'],
  platform: 'node',
  external: ['miniflare', 'workerd', '@cspotcode/source-map-support'],
});

export default [buildClientConfig, buildPluginConfig];
