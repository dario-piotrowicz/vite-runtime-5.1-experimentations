import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Miniflare } from 'miniflare';

import { type ViteDevServer } from 'vite';
import type {
  SSRRuntime,
  CreateRequestDispatcher,
  DispatchRequest,
} from 'shared-vite-runtime-utils';
import {
  getFetchModuleUrl,
  setupFetchModuleEndpoint,
} from 'shared-vite-runtime-utils';

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
        setupFetchModuleEndpoint(server);

        const createRequestDispatcher = getCreateRequestDispatcher(server);

        ssrRuntimeResolve({
          createRequestDispatcher,
        });
      });
    },
  };
}

/**
 * gets the `createRequestDispatcher` that can be then added to the `ssrRuntime`
 * and used by third-party plugins
 */
function getCreateRequestDispatcher(server: ViteDevServer) {
  const createRequestDispatcher: CreateRequestDispatcher = async ({
    entrypoint,
  }) => {
    // module is used to collect the cjs exports from the module evaluation
    const dispatchRequestImplementation = await getClientDispatchRequest(
      server,
      entrypoint,
      getFetchModuleUrl(server),
    );

    const dispatchRequest: DispatchRequest = async request => {
      return dispatchRequestImplementation(request);
    };
    return dispatchRequest;
  };

  return createRequestDispatcher;
}

/**
 * Gets the `dispatchRequest` from the client (e.g. from the js running inside the workerd)
 */
async function getClientDispatchRequest(
  server: ViteDevServer,
  entrypoint: string,
  fetchModuleUrl: string,
): Promise<DispatchRequest> {
  const script = await getClientScript(server, entrypoint, fetchModuleUrl);

  const mf = new Miniflare({
    script,
    modules: true,
    unsafeEvalBinding: 'UNSAFE_EVAL',
    compatibilityDate: '2024-02-08',
  });

  const serverAddress = server.httpServer.address();
  const serverBaseAddress =
    typeof serverAddress === 'string'
      ? serverAddress
      : `http://${serverAddress.address}:${serverAddress.port}`;

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
