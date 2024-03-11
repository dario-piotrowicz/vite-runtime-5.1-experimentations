import type { HMRPayload } from 'vite';
import type { FetchResult, HMRRuntimeConnection } from 'vite/runtime';
import { ESModulesRunner, ViteRuntime } from 'vite/runtime';

// we use `ws` here because the node built-in `fetch`
// method does not support the `upgrade` header
import type { WebSocket } from 'ws';

declare const __ROOT__: string;
declare const __ENTRYPOINT__: string;
declare const __FETCH_MODULE_URL__: string;
declare const __VITE_HMR_URL__: string;

async function fetchModule(id: string, importer?: string) {
  const idParam = `id=${id}`;
  const importerParam = importer ? `importer=${importer}` : null;
  const params = [idParam, importerParam].filter(Boolean);
  const resp = await fetch(__FETCH_MODULE_URL__ + `?${params.join('&')}`);
  const json = await resp.json();
  return json as FetchResult;
}

let onHmrReceive: ((payload: HMRPayload) => void) | undefined;

let hmrReady = true;

// @ts-ignore
const ws = new WebSocket(__VITE_HMR_URL__, ['vite-hmr']);

ws.addEventListener('message', message => {
  if (onHmrReceive) {
    let data: HMRPayload = JSON.parse(message.data?.toString());
    onHmrReceive(data);
  }
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

const viteRuntime = new ViteRuntime(
  {
    root: __ROOT__,
    fetchModule,
    hmr: {
      connection: hmrConnection,
    },
  },
  new ESModulesRunner(),
);

globalThis.__viteRuntime = viteRuntime;

export async function dispatchRequestImplementation(
  req: Request,
  env: Record<string, unknown>,
) {
  const entrypointModule = await viteRuntime.executeUrl(__ENTRYPOINT__);
  // Note: here we make the assumption that an entrypoint for the Nodejs runtime
  //       has a default export with a `fetch` method that takes a request and returns
  //       a response (akin to what happens in workerd).
  //       This is likely not a great assumption and something we'll need to address.
  const fetch = entrypointModule.default.fetch;
  return fetch(req, env);
}
