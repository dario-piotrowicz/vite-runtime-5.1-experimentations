import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runInContext, createContext } from 'node:vm';

import { type ViteDevServer } from 'vite';

const _dirname = dirname(fileURLToPath(import.meta.url));
const clientPath = resolve(_dirname, './client/index.cjs');

export function viteRuntimeNode() {
  return {
    name: 'vite-runtime-node-plugin',
    async configureServer(server: ViteDevServer) {
      let ssrRuntimeResolve: (runtime: SSRRuntime) => void;
      const ssrRuntime$ = new Promise<SSRRuntime>(resolve => {
        ssrRuntimeResolve = resolve;
      });

      const clientContent = await readFile(clientPath, 'utf-8');

      server.httpServer.once('listening', () => {
        const createRequestDispatcher = async ({ entrypoint }) => {
          // this could be in the future replaced with websockets or an rpc mechanism
          server.middlewares.use(async (request, resp, next) => {
            if (!request.url.startsWith('/__fetch-module__/')) {
              next();
              return;
            }

            const url = new URL(`http://localhost${request.url}`);

            const id = url.searchParams.get('id');
            const importer = url.searchParams.get('importer');

            const module = await server.ssrFetchModule(
              id,
              importer || undefined,
            );

            resp.writeHead(200, { 'Content-Type': 'application/json' });
            resp.end(JSON.stringify(module));
          });

          const module = {};

          const vmContext = createContext({
            fetch,
            module,
            URL,
            Response,
          });

          const serverAddress = server.httpServer.address();
          const fetchModuleUrl = `${
            typeof serverAddress === 'string'
              ? serverAddress
              : `http://${serverAddress.address}:${serverAddress.port}`
          }/__fetch-module__/`;

          const client = clientContent
            .replace(/__ROOT__/g, JSON.stringify(server.config.root))
            .replace(/__ENTRYPOINT__/g, JSON.stringify(entrypoint))
            .replace(/__FETCH_MODULE_URL__/g, JSON.stringify(fetchModuleUrl));
          runInContext(client, vmContext);

          const dispatchRequestImplementation = (
            module as { exports: { dispatchRequestImplementation: Function } }
          ).exports.dispatchRequestImplementation;

          const dispatchRequest = async request => {
            return dispatchRequestImplementation(request);
          };
          return dispatchRequest;
        };

        ssrRuntimeResolve({
          createRequestDispatcher,
        });
      });

      server.ssrRuntime$ = ssrRuntime$;
    },
  };
}

declare module 'vite' {
  interface ViteDevServer {
    /**
     * Note: ssrRuntime needs to be promise-based because in the plugin's `configureServer`
     *       we need to wait until the Vite dev server Http server is ready in order to get
     *       its address and pass it to the alternative runtime
     */
    ssrRuntime$: Promise<SSRRuntime>;
  }
}

type SSRRuntime = {
  createRequestDispatcher: (
    options: CreateRequestDispatcher,
  ) => Promise<Function>;
};

type CreateRequestDispatcher = {
  entrypoint: string;
};
