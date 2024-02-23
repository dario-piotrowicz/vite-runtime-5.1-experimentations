import { viteRuntimeNode } from 'vite-runtime-node-plugin';
import { viteRuntimeWorkerd } from 'vite-runtime-workerd-plugin';

export function basicHandler({ entrypoint }) {
  return {
    name: 'basic-handler-plugin',
    configureServer(server) {
      return async () => {
        const ssrRuntime = await server.ssrRuntime$;
        const dispatchRequest = await ssrRuntime.createRequestDispatcher({
          entrypoint,
        });

        server.middlewares.use(async (req, res) => {
          const resp = await dispatchRequest(req);
          const html = await resp.text();
          const transformedHtml = await server.transformIndexHtml(
            req.url,
            html,
          );
          res.end(transformedHtml);
        });
      };
    },
  };
}

const runtimePlugins = {
  node: viteRuntimeNode,
  workerd: viteRuntimeWorkerd,
};

const runtime =
  runtimePlugins[process.env._VITE_TARGET_RUNTIME] ?? runtimePlugins['node'];

/** @type {import('vite').UserConfig} */
export default {
  appType: 'custom',
  ssr: {
    target: 'webworker',
  },
  optimizeDeps: {
    include: [],
  },
  plugins: [runtime(), basicHandler({ entrypoint: './entry.ts' })],
  build: {
    minify: false,
  },
};
