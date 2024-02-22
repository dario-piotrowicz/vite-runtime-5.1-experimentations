import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runInContext, createContext } from 'node:vm';

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

export function viteRuntimeNode() {
  return {
    name: 'vite-runtime-node-plugin',
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
 * Gets the `dispatchRequest` from the client (e.g. from the js running inside the vm)
 */
async function getClientDispatchRequest(
  server: ViteDevServer,
  entrypoint: string,
  fetchModuleUrl: string,
): Promise<DispatchRequest> {
  // module is used to collect the cjs exports from the module evaluation
  const module = {};

  // values/classes that we pass to the vm for convenience,
  // we can assume that any runtime will always have such built-in
  const fetchUtilities = {
    fetch,
    URL,
    Response,
  };

  const vmContext = createContext({
    module,
    ...fetchUtilities,
  });

  runInContext(
    await getClientScript(server, entrypoint, fetchModuleUrl),
    vmContext,
  );

  const dispatchRequestImplementation = (
    module as { exports: { dispatchRequestImplementation: DispatchRequest } }
  ).exports.dispatchRequestImplementation;

  return dispatchRequestImplementation;
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
  const _dirname = dirname(fileURLToPath(import.meta.url));
  const clientPath = resolve(_dirname, './client/index.cjs');
  const clientContent = await readFile(clientPath, 'utf-8');

  return clientContent
    .replace(/__ROOT__/g, JSON.stringify(server.config.root))
    .replace(/__ENTRYPOINT__/g, JSON.stringify(entrypoint))
    .replace(/__FETCH_MODULE_URL__/g, JSON.stringify(fetchModuleUrl));
}
