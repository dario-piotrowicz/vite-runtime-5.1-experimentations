import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, posix } from 'node:path';
import { runInContext, createContext } from 'node:vm';

import { type ViteDevServer } from 'vite';
import { WebSocket } from 'ws';

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
  const networkUtilities = {
    fetch,
    URL,
    Response,
    WebSocket,
  };

  const vmContext = createContext({
    module,
    ...networkUtilities,
    console,
    // Note: without passing `setTimeout` the `runInContext` errors with: `ReferenceError: Buffer is not defined`
    //       and if `Buffer` is passed here without `setTimeout` the error becomes: `ReferenceError: setTimeout is not defined`
    //       I am not really sure what's going on...
    setTimeout,
  });

  runInContext(
    await getClientScript(server, entrypoint, fetchModuleUrl),
    vmContext,
    {
      // temporary hack needed because in the `@remix-run/dev` package the `node-dev-entrypoint.ts`
      // file has been written by hand and is not bundled (for simplicity)
      importModuleDynamically: specifier => {
        return import(specifier) as any;
      },
    },
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
    .replace(/__FETCH_MODULE_URL__/g, JSON.stringify(fetchModuleUrl))
    .replace(/__VITE_HMR_URL__/g, JSON.stringify(getHmrUrl(server)));
}

export function getHmrUrl(viteDevServer: ViteDevServer) {
  const userHmrValue = viteDevServer.config.server?.hmr;

  if (userHmrValue === false) {
    console.warn(
      'HMR is disabled. Code changes will not be reflected in neither browser or server.',
    );

    return '';
  }

  const configHmr = typeof userHmrValue === 'object' ? userHmrValue : {};

  const hmrPort = configHmr.port;
  const hmrPath = configHmr.path;

  let hmrBase = viteDevServer.config.base;
  if (hmrPath) hmrBase = posix.join(hmrBase, hmrPath);

  return `ws://${viteDevServer.config.server.host ?? 'localhost'}:${hmrPort ?? viteDevServer.config.server.port}${hmrBase}`;
}
