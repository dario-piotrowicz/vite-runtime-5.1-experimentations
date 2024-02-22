import { ESModulesRunner, type FetchResult, ViteRuntime } from 'vite/runtime';

declare const __ROOT__: string;
declare const __ENTRYPOINT__: string;
declare const __FETCH_MODULE_URL__: string;

async function fetchModule(id: string, importer?: string) {
  const idParam = `id=${id}`;
  const importerParam = importer ? `importer=${importer}` : null;
  const params = [idParam, importerParam].filter(Boolean);
  const resp = await fetch(__FETCH_MODULE_URL__ + `?${params.join('&')}`);
  const json = await resp.json();
  return json as FetchResult;
}

const runtime = new ViteRuntime(
  {
    root: __ROOT__,
    fetchModule,
  },
  new ESModulesRunner(),
);

export async function dispatchRequestImplementation(req: Request) {
  // Note: clear the moduleCache so that if the entrypoint changes the
  //       changes are picked up (after manually refreshing the browser).
  //       This should not be needed when HMR is working
  runtime.moduleCache.clear();

  const entrypointModule = await runtime.executeUrl(__ENTRYPOINT__);
  // Note: here we make the assumption that an entrypoint for the Nodejs runtime
  //       has a default export with a `fetch` method that takes a request and returns
  //       a response (akin to what happens in workerd).
  //       This is likely not a great assumption and something we'll need to address.
  const fetch = entrypointModule.default.fetch;
  return fetch(req);
}
