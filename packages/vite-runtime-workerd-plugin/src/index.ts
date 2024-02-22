import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Miniflare } from 'miniflare';

import { type ViteDevServer } from 'vite';

export function viteRuntimeWorkerd() {
  return {
    name: 'vite-runtime-workerd-plugin',
    async configureServer(server: ViteDevServer) {
      let ssrRuntimeResolve: (runtime: SSRRuntime) => void;
      const ssrRuntime$ = new Promise<SSRRuntime>(resolve => {
        ssrRuntimeResolve = resolve;
      });
      server.ssrRuntime$ = ssrRuntime$;

      server.httpServer.once('listening', () => {
        // once the httpServer is ready we can create a `createRequestDispatcher`
        const createRequestDispatcher = getCreateRequestDispatcher(server);

        ssrRuntimeResolve({
          createRequestDispatcher,
        });
      });
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
  createRequestDispatcher: CreateRequestDispatcher;
};

type CreateRequestDispatcher = (
  options: CreateRequestDispatcherOptions,
) => Promise<DispatchRequest>;

type CreateRequestDispatcherOptions = {
  entrypoint: string;
};

type DispatchRequest = (req: Request) => Response | Promise<Response>;

/**
 * gets the `createRequestDispatcher` that can be then added to the `ssrRuntime`
 * and used by third-party plugins
 */
function getCreateRequestDispatcher(server: ViteDevServer) {
  const createRequestDispatcher: CreateRequestDispatcher = async ({
    entrypoint,
  }) => {
    setupFetchModuleEndpoint(server);

    // module is used to collect the cjs exports from the module evaluation
    const dispatchRequestImplementation = await getClientDispatchRequest(
      server,
      entrypoint,
    );

    const dispatchRequest: DispatchRequest = async request => {
      return dispatchRequestImplementation(request);
    };
    return dispatchRequest;
  };

  return createRequestDispatcher;
}

/**
 * Sets up a fetch-module endpoint that can be used to fetch modules
 * from the client (running in isolation the vm)
 *
 * Note: This could be implemented differently like via websockets or an rpc mechanism
 */
function setupFetchModuleEndpoint(server: ViteDevServer) {
  server.middlewares.use(async (request, resp, next) => {
    if (!request.url.startsWith(fetchModulePath)) {
      next();
      return;
    }

    const url = new URL(`http://localhost${request.url}`);

    const id = url.searchParams.get('id');
    const importer = url.searchParams.get('importer');

    const module = await server.ssrFetchModule(id, importer || undefined);

    resp.writeHead(200, { 'Content-Type': 'application/json' });
    resp.end(JSON.stringify(module));
  });
}

/**
 * Gets the `dispatchRequest` from the client (e.g. from the js running inside the workerd)
 */
async function getClientDispatchRequest(
  server: ViteDevServer,
  entrypoint: string,
): Promise<DispatchRequest> {
  const serverAddress = server.httpServer.address();
  const serverBaseAddress =
    typeof serverAddress === 'string'
      ? serverAddress
      : `http://${serverAddress.address}:${serverAddress.port}`;

  const fetchModuleUrl = `${serverBaseAddress}${fetchModulePath}`;

  const script = await getClientScript(server, entrypoint, fetchModuleUrl);

  const mf = new Miniflare({
    script,
    modules: true,
    unsafeEvalBinding: 'UNSAFE_EVAL',
    compatibilityDate: '2024-02-08',
  });

  return (req: Request) => {
    return mf.dispatchFetch(`${serverBaseAddress}${req.url}`);
  };
}

/**
 * gets the client script to be run in the vm, it also applies
 * the various required string replacements
 */
async function getClientScript(
  server: ViteDevServer,
  entrypoint: string,
  fetchModuleUrl: string,
) {
  const clientPath = resolve(__dirname, './client/index.js');
  const clientContent = await readFile(clientPath, 'utf-8');

  return clientContent
    .replace(/__ROOT__/g, JSON.stringify(server.config.root))
    .replace(/__ENTRYPOINT__/g, JSON.stringify(entrypoint))
    .replace(/__FETCH_MODULE_URL__/g, JSON.stringify(fetchModuleUrl));
}

/**
 * Path used to set up a remote fetch-module mechanism, the vite dev server sets up a middleware
 * endpoint with such path allowing external users to fetch modules
 *
 * the client residing in the vm the uses this endpoint to gets modules remotely
 */
const fetchModulePath = '/__fetch-module__/' as const;
