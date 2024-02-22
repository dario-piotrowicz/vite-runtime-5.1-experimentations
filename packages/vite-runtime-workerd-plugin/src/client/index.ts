import {
  type FetchResult,
  ViteRuntime,
  type ViteModuleRunner,
} from 'vite/runtime';

declare const __ROOT__: string;
declare const __ENTRYPOINT__: string;
declare const __FETCH_MODULE_URL__: string;

let unsafeEval: {
  eval: (code: string, ...args: any[]) => any;
};

export default {
  async fetch(req: Request, env: any) {
    unsafeEval = env.UNSAFE_EVAL;

    // Note: clear the moduleCache so that if the entrypoint changes the
    //       changes are picked up (after manually refreshing the browser).
    //       This should not be needed when HMR is working
    runtime.moduleCache.clear();

    const entrypointModule = await runtime.executeUrl(__ENTRYPOINT__);
    const fetch = entrypointModule.default.fetch;
    return fetch(req);
  },
};

async function fetchModule(id: string, importer?: string) {
  const idParam = `id=${id}`;
  const importerParam = importer ? `importer=${importer}` : null;
  const params = [idParam, importerParam].filter(Boolean);
  const resp = await fetch(__FETCH_MODULE_URL__ + `?${params.join('&')}`);
  const json = await resp.json();
  return json as FetchResult;
}

class WorkerdModuleRunner implements ViteModuleRunner {
  async runViteModule(context, transformed, id) {
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

  runExternalModule(filepath): Promise<any> {
    console.error('[vite-node-miniflare] runExternalModule:', filepath);
    throw new Error(`[vite-node-miniflare] runExternalModule: ${filepath}`);
  }
}

const runtime = new ViteRuntime(
  {
    root: __ROOT__,
    fetchModule,
  },
  new WorkerdModuleRunner(),
);
