import type {
  FetchResult,
  ViteModuleRunner,
  HMRRuntimeConnection,
  ViteRuntimeModuleContext,
} from 'vite/runtime';
import { ViteRuntime } from 'vite/runtime';
import type { HMRPayload } from 'vite';

declare const __ROOT__: string;
declare const __ENTRYPOINT__: string;
declare const __FETCH_MODULE_URL__: string;
declare const __VITE_HMR_URL__: string;

let unsafeEval: {
  eval: (code: string, ...args: any[]) => any;
};

export default {
  async fetch(req: Request, env: any) {
    unsafeEval = env.UNSAFE_EVAL;

    const viteRuntime = getViteRuntime();
    const entrypointModule =
      await viteRuntime.executeEntrypoint(__ENTRYPOINT__);
    const fetch = entrypointModule.default.fetch;
    return fetch(req);
  },
};

let runtime: ViteRuntime;

function getViteRuntime() {
  if (runtime) return runtime;

  let onHmrReceive: ((payload: HMRPayload) => void) | undefined;

  let hmrReady = false;
  connectHmrWsClient().then(hmrWs => {
    hmrReady = !!hmrWs;
    hmrWs.addEventListener('message', message => {
      if (onHmrReceive) {
        let data: HMRPayload = JSON.parse(message.data?.toString());
        onHmrReceive(data);
      }
    });
  });

  const hmrConnection: HMRRuntimeConnection = {
    isReady: () => hmrReady,
    send: () => {},
    onUpdate(receiver) {
      onHmrReceive = receiver;
      return () => {
        onHmrReceive = undefined;
      };
    },
  };

  runtime = new ViteRuntime(
    {
      root: __ROOT__,
      fetchModule,
      hmr: {
        connection: hmrConnection,
      },
    },
    new WorkerdModuleRunner(),
  );

  return runtime;
}

async function fetchModule(id: string, importer?: string) {
  const idParam = `id=${id}`;
  const importerParam = importer ? `importer=${importer}` : null;
  const params = [idParam, importerParam].filter(Boolean);
  const resp = await fetch(__FETCH_MODULE_URL__ + `?${params.join('&')}`);
  const json = await resp.json();
  return json as FetchResult;
}

/**
 * Establish a WebSocket connection to the HMR server.
 * Note: HMR in the server is just for invalidating modules
 * in workerd/ViteRuntime cache, not to refresh the browser.
 */
async function connectHmrWsClient() {
  return fetch(__VITE_HMR_URL__, {
    // When the HTTP port and the HMR port are the same, Vite reuses the same server for both.
    // This happens when not specifying the HMR port in the Vite config. Otherwise, Vite creates
    // a new server for HMR. In the first case, the protocol header is required to specify
    // that the connection to the main HTTP server via WS is for HMR.
    // Ref: https://github.com/vitejs/vite/blob/7440191715b07a50992fcf8c90d07600dffc375e/packages/vite/src/node/server/ws.ts#L120-L127
    headers: { Upgrade: 'websocket', 'sec-websocket-protocol': 'vite-hmr' },
  }).then((response: unknown) => {
    const ws = (response as any).webSocket;

    if (!ws) throw new Error('Failed to connect to HMR server');

    ws.accept();
    return ws;
  });
}

class WorkerdModuleRunner implements ViteModuleRunner {
  async runViteModule(
    context: ViteRuntimeModuleContext,
    transformed: string,
    id: string,
  ) {
    // Following what vite-node/client does:
    // https://github.com/vitest-dev/vitest/blob/d68a73908/packages/vite-node/src/client.ts#L415
    const codeDefinition = `'use strict';async (${Object.keys(context).join(
      ',',
    )})=>{{`;
    const code = `${codeDefinition}${transformed}\n}}`;
    const fn = unsafeEval.eval(code, id);
    await fn(...Object.values(context));
    Object.freeze(context.__vite_ssr_exports__);
  }

  runExternalModule(filepath: string): Promise<any> {
    throw new Error(`[vite-node-miniflare] runExternalModule: ${filepath}`);
  }
}
