import { viteRuntimeNode } from 'vite-runtime-node-plugin';

export function basicHandler({ entrypoint }) {
  return {
    name: 'basic-handler-plugin',
    configureServer(server) {
      return async () => {
        console.log('\n\n[basic-handler-plugin] configureServer...\n\n');
        const dispatchRequest = server.ssrRuntime.createRequestDispatcher({
          entrypoint,
        });

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
  appType: 'custom',
  ssr: {
    target: 'webworker',
  },
  optimizeDeps: {
    include: [],
  },
  plugins: [viteRuntimeNode(), basicHandler({ entrypoint: './entry.ts' })],
  build: {
    minify: false,
  },
};
