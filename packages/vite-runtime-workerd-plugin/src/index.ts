import { readFile } from 'node:fs/promises';
import { posix, resolve } from 'node:path';
import { Miniflare } from 'miniflare';
import { unstable_getMiniflareWorkerOptions } from 'wrangler';
import httpProxy from 'http-proxy';
import http from 'http';
import net from 'net';
import { HmrContext, type ViteDevServer } from 'vite';
import type {
  SSRRuntime,
  CreateRequestDispatcher,
  DispatchRequest,
} from 'shared-vite-runtime-utils';
import {
  getFetchModuleUrl,
  setupFetchModuleEndpoint,
} from 'shared-vite-runtime-utils';

let mf: Miniflare | null;
let script: string | null;
let inspectorProxyServer: http.Server | null;
let inspectorProxy: httpProxy | null;
let inspectorProxyPort: number | null;

let buffer: Request[] = [];

const INSPECTOR_PORT = 23123;
const INSPECTOR_PROXY_PORT = 9229;

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

      inspectorProxyPort = await getNextAvailablePort(INSPECTOR_PROXY_PORT);

      inspectorProxyServer = http.createServer();
      inspectorProxyServer.listen(inspectorProxyPort);

      console.log('Miniflare debugger port: ', inspectorProxyPort);
      console.log(
        'More info on debugging with Miniflare can be found here: https://developers.cloudflare.com/workers/observability/local-development-and-testing/#debug-via-breakpoints\n',
      );
    },
    async handleHotUpdate(ctx: HmrContext) {
      if (ctx.file.endsWith('wrangler.toml')) {
        await mf.dispose();
        // Explicitly set mf to null so we can signal buffering to begin
        mf = null;

        mf = new Miniflare(await getMiniflareOptions());
        await mf.ready;
        drainBuffer(ctx.server);
        // await mf.setOptions(await getMiniflareOptions());
        console.log('Refreshed Miniflare bindings from `wrangler.toml`');
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

async function getMiniflareOptions() {
  const inspectorPort = await setupInspectorProxy();

  return {
    script,
    modules: true,
    unsafeEvalBinding: 'UNSAFE_EVAL',
    compatibilityDate: '2024-02-08',
    inspectorPort,
    ...getOptionsFromWranglerToml(),
  };
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

  const options = await getMiniflareOptions();
  mf = new Miniflare(options);

  const serverBaseAddress = getServerBaseAddress(server);

  return (req: Request) => {
    if (mf) {
      return mf.dispatchFetch(`${serverBaseAddress}${req.url}`);
    }

    // If miniflare is unavailable (due to being re-initialized), buffer the
    // request instead of dispatching it
    buffer.push(req);
  };
}

// Dispatch any buffered requests and empty the buffer
async function drainBuffer(server: ViteDevServer) {
  const serverBaseAddress = getServerBaseAddress(server);
  for (const req of buffer) {
    await mf.dispatchFetch(`${serverBaseAddress}${req.url}`);
  }
  buffer = [];
}

// Initialize (or re-initialize) the inspector proxy server. Returns the port
// of the proxy target which we feed to miniflare's `inspectorPort`
async function setupInspectorProxy() {
  // Remove any existing listeners that call the current `proxy`
  inspectorProxyServer.removeAllListeners('request');
  inspectorProxyServer.removeAllListeners('upgrade');

  // Dispose of the old proxy and recreate it, potentially with a new
  // target port
  if (inspectorProxy) {
    inspectorProxy.removeAllListeners();
    inspectorProxy.close();
  }

  // Find an available inspector port. This port will be passed directly
  // to miniflare. We look for an avaiable one since a zombie workerd process
  // might be hanging on to the last one we used. If it is, we don't want miniflare to hang
  const inspectorPort = await getNextAvailablePort(INSPECTOR_PORT);

  // Create a new http proxy targeting our desired port
  inspectorProxy = httpProxy.createProxyServer({
    target: {
      host: 'localhost',
      port: inspectorPort,
    },
  });

  inspectorProxyServer.on('request', (req, res) => {
    inspectorProxy.web(req, res);
  });

  // Forward websocket requests from the user facing inspector port (9229) to the proxied
  // inspector port (23123)
  inspectorProxyServer.on('upgrade', function (req, socket, head) {
    inspectorProxy.ws(req, socket, head);
  });

  return inspectorPort;
}

// Finds the next available port starting at `port`
async function getNextAvailablePort(port: number) {
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}

// Checks if the provided port is available
async function isPortAvailable(port: number) {
  const socket = new net.Socket();

  const cleanup = () => {
    socket.removeAllListeners('connect');
    socket.removeAllListeners('error');
    socket.end();
    socket.destroy();
    socket.unref();
  };

  return new Promise((resolve, reject) => {
    socket.once('connect', () => {
      // We connected, something is listening, not available
      resolve(false);
      cleanup();
    });
    socket.once('error', (e: { code: string }) => {
      if (e.code === 'ECONNREFUSED') {
        // Connection was refused because port was open, available
        resolve(true);
      } else {
        // Unexpected error, bubble the exception
        reject(e);
      }
      cleanup();
    });

    socket.connect(port);
  });
}

function getOptionsFromWranglerToml() {
  const { workerOptions } = unstable_getMiniflareWorkerOptions('wrangler.toml');

  // serviceBindings, outboundService, durableObjects can't be passed to Miniflare
  // due to type incompatabilities.
  const { serviceBindings, outboundService, durableObjects, ...options } =
    workerOptions;

  return options;
}

function getServerBaseAddress(server: ViteDevServer) {
  const serverAddress = server.httpServer.address();
  return typeof serverAddress === 'string'
    ? serverAddress
    : `http://${!serverAddress.address.match(/:/) ? serverAddress.address : 'localhost'}:${serverAddress.port}`;
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
