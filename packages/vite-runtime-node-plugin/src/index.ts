import { type ViteDevServer, createViteRuntime } from 'vite';

export function viteRuntimeNode() {
  return {
    name: 'vite-runtime-node-plugin',
    async configureServer(server: ViteDevServer) {
      console.log('\n\n[vite-runtime-node-plugin] configureServer...\n\n');

      const runtime = await createViteRuntime(server, {
        hmr: false,
      });

      console.log('\n\n[vite-runtime-node-plugin] runtime created...\n\n');

      const createRequestDispatcher = ({ entrypoint }: CreateRequestDispatcher) => {
          const dispatchRequest = async request => {
            // Note: clear the moduleCache so that if the entrypoint changes we do reflect such changes
            runtime.moduleCache.clear();
            const module = await runtime.executeUrl(entrypoint);
            return module.default.fetch(request);
          };
          return dispatchRequest;
      };

      server.ssrRuntime = {
        createRequestDispatcher,
      };
    },
  };
}

declare module 'vite' {
  interface ViteDevServer {
    ssrRuntime: SSrRuntime;
  }
}

type SSrRuntime = {
  createRequestDispatcher: (options: CreateRequestDispatcher) => Function;
};

type CreateRequestDispatcher = {
  entrypoint: string;
};
