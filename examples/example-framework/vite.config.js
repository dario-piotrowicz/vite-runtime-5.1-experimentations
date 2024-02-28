import { viteRuntimeNode } from 'vite-runtime-node-plugin';
import { viteRuntimeWorkerd } from 'vite-runtime-workerd-plugin';

export function exampleFramework({ entrypoint, serverRuntimeId }) {
  return {
    name: 'example-framework-plugin',
    configureServer(server) {
      return async () => {
        // Note: here we create an instance of the chosen runtime, interestingly we can:
        //       - create more instances of the same runtime (with maybe different options for example)
        //       - create instances of different runtimes (to use multiple runtimes together!)
        const options =
          serverRuntimeId === 'workerd'
            ? {
                // if the workerd runtime is being used we can customize its behavior, for example
                // here we specify that no inspectorPort should be used (to disable debugging)
                inspectorPort: false,
              }
            : {};
        const serverRuntime = await server.createServerRuntime(
          serverRuntimeId,
          options,
        );

        const dispatchRequest = await serverRuntime.createRequestDispatcher({
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
    serverRuntimeId: 'node',
    entrypoint: './entry-node.ts',
  },
  workerd: {
    serverRuntimeId: 'workerd',
    entrypoint: './entry-workerd.ts',
  },
};

// These plugins register all the available runtimes as project might require more
// than one runtime (for example see Next.js with their Node.js and Edge runtimes)
const runtimeRegistrationPlugins = [
  // we register the node runtime here, that could
  // actually be baked-in into vite itself
  viteRuntimeNode(),
  viteRuntimeWorkerd(),
];

const runtimeInfo =
  runtimeInfos[process.env._VITE_TARGET_RUNTIME] ?? runtimeInfos['node'];

const { serverRuntimeId, entrypoint } = runtimeInfo;

/** @type {import('vite').UserConfig} */
export default {
  appType: 'custom',
  ssr: {
    target: 'webworker',
  },
  optimizeDeps: {
    include: [],
  },
  plugins: [
    ...runtimeRegistrationPlugins,
    // note that the application developer can via vite.config.js decide which server runtime to use
    exampleFramework({ entrypoint, serverRuntimeId }),
  ],
  build: {
    minify: false,
  },
};
