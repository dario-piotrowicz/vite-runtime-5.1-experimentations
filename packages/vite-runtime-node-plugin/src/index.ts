import { runInContext, createContext } from 'node:vm';

import { type ViteDevServer } from 'vite';
import { ESModulesRunner, ViteRuntime } from 'vite/runtime';

export function viteRuntimeNode() {
  return {
    name: 'vite-runtime-node-plugin',
    async configureServer(server: ViteDevServer) {
      console.log('\n\n[vite-runtime-node-plugin] configureServer...\n\n');

      const vmContext = createContext({
        ViteRuntime,
        ESModulesRunner,
        ssrFetchModule: server.ssrFetchModule,
        root: JSON.stringify(server.config.root),
      });
      const createRequestDispatcher = async ({ entrypoint }) => {
        const vmFetch = await runInContext(
          `
        (async () => {
          const runtime = new ViteRuntime({
            root,
            fetchModule: ssrFetchModule,
          }, new ESModulesRunner());

          return async function fetcher(req) {
            // Note: clear the moduleCache so that if the entrypoint changes we do reflect such changes
            //       this should not be needed when HMR is working 
            runtime.moduleCache.clear();

            const fetch = (await runtime.executeUrl(${JSON.stringify(entrypoint)})).default.fetch;
            return fetch(req);
          }
        })()
          `,
          vmContext,
        );
        const dispatchRequest = async request => {
          return vmFetch(request);
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
  createRequestDispatcher: (
    options: CreateRequestDispatcher,
  ) => Promise<Function>;
};

type CreateRequestDispatcher = {
  entrypoint: string;
};
