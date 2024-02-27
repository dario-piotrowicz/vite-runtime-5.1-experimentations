import { viteRuntimeNode } from 'vite-runtime-node-plugin';
import { viteRuntimeWorkerd } from 'vite-runtime-workerd-plugin';

export function exampleFramework({ entrypoint }) {
  return {
    name: 'example-framework-plugin',
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

const runtimeInfos = {
  node: {
    plugin: viteRuntimeNode,
    entrypoint: './entry-node.ts',
  },
  workerd: {
    plugin: viteRuntimeWorkerd,
    entrypoint: './entry-workerd.ts',
  },
};

const runtimeInfo =
  runtimeInfos[process.env._VITE_TARGET_RUNTIME] ?? runtimeInfos['node'];

const { plugin, entrypoint } = runtimeInfo;

/** @type {import('vite').UserConfig} */
export default {
  appType: 'custom',
  ssr: {
    target: 'webworker',
  },
  optimizeDeps: {
    include: [],
  },
  plugins: [plugin(), exampleFramework({ entrypoint })],
  build: {
    minify: false,
  },
};
