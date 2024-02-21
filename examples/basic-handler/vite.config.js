import { createViteRuntime } from 'vite';
import { viteRuntimeNode } from 'vite-runtime-node-plugin';

export function basicHandler({ entrypoint }) {
  return {
    name: "basic-handler-plugin",
    configureServer(server) {
      return async () => {
        const runtime = await createViteRuntime(server, {
          hmr: false
        });

        const dispatchRequest = async (request) => {
          // Note: clear the moduleCache so that if the entrypoint changes we do reflect such changes
          runtime.moduleCache.clear();
          const module = await runtime.executeUrl(
            entrypoint
          );
          return module.default.fetch(request);
        }

        server.middlewares.use(async (req, res) => {
          const resp = await dispatchRequest(req);
          res.end(await resp.text());
        });
      };
    },
  };
}


/** @type {import('vite').UserConfig} */
export default {
  appType: "custom",
  ssr: {
    target: "webworker",
  },
  optimizeDeps: {
    include: [],
  },
  plugins: [
    viteRuntimeNode(),
    basicHandler({ entrypoint: './entry.ts' })
  ],
  build: {
    minify: false,
  },
};
