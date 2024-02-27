import { readFile } from 'node:fs/promises';
import { posix, resolve } from 'node:path';
import { Miniflare } from 'miniflare';
import { unstable_getMiniflareWorkerOptions } from 'wrangler';

import { HmrContext, type ViteDevServer } from 'vite';
import type {
  CreateRequestDispatcher,
  DispatchRequest,
  ServerRuntime,
} from 'shared-vite-runtime-utils';
import {
  getFetchModuleUrl,
  setupFetchModuleEndpoint,
  setupServerRuntimeRegistration,
} from 'shared-vite-runtime-utils';

let mf: Miniflare | null;
let script: string | null;

export function viteRuntimeWorkerd() {
  return {
    name: 'vite-runtime-workerd-plugin',
    configureServer(server: ViteDevServer) {
      // IMPORTANT: the following line should not be needed
      //            if ViteDevServer were to have the runtime
      //            registration built in
      setupServerRuntimeRegistration(server);

      const runtimeCreation = () => {
        let runtimeResolve: (runtime: ServerRuntime) => void;
        const runtimePromise = new Promise<ServerRuntime>(resolve => {
          runtimeResolve = resolve;
        });

        server.httpServer.once('listening', () => {
          setupFetchModuleEndpoint(server);

          const createRequestDispatcher = getCreateRequestDispatcher(server);

          runtimeResolve({
            createRequestDispatcher,
          });
        });

        return runtimePromise;
      };

      server.registerServerRuntime('workerd', runtimeCreation);
    },
    async handleHotUpdate(ctx: HmrContext) {
      if (ctx.file.endsWith('wrangler.toml')) {
        console.log('Refreshed Miniflare bindings from `wrangler.toml`');
        await mf.setOptions(getMiniflareOptions());
      }
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

function getMiniflareOptions() {
  return {
    script,
    modules: true,
    unsafeEvalBinding: 'UNSAFE_EVAL',
    compatibilityDate: '2024-02-08',
    inspectorPort: 9229,
    ...getOptionsFromWranglerToml(),
  };
}

function getOptionsFromWranglerToml() {
  const { workerOptions } = unstable_getMiniflareWorkerOptions('wrangler.toml');

  // serviceBindings, outboundService, durableObjects can't be passed to Miniflare
  // due to type incompatabilities.
  const { serviceBindings, outboundService, durableObjects, ...options } =
    workerOptions;

  return options;
}

/**
 * Gets the `dispatchRequest` from the client (e.g. from the js running inside the workerd)
 */
async function getClientDispatchRequest(
  server: ViteDevServer,
  entrypoint: string,
  fetchModuleUrl: string,
): Promise<DispatchRequest> {
  script = await getClientScript(server, entrypoint, fetchModuleUrl);

  mf = new Miniflare(getMiniflareOptions());

  const serverAddress = server.httpServer.address();
  const serverBaseAddress =
    typeof serverAddress === 'string'
      ? serverAddress
      : `http://${!serverAddress.address.match(/:/) ? serverAddress.address : 'localhost'}:${serverAddress.port}`;

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

  return `http://${viteDevServer.config.server.host ?? 'localhost'}:${hmrPort ?? viteDevServer.config.server.port}${hmrBase}`;
}
