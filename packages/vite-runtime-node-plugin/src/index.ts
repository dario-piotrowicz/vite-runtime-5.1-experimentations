import { type ViteDevServer } from 'vite';

export function viteRuntimeNode() {
  return {
    name: 'vite-runtime-node-plugin',
    configureServer(server: ViteDevServer) {
      return () => {
        console.log('\n\n[vite-runtime-node-plugin] configureServer...\n\n');
      };
    },
  };
}
