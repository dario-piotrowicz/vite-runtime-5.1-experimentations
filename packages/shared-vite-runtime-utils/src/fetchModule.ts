import type { ViteDevServer } from 'vite';

let setupFetchModuleEndpointExists = false;

/**
 * Sets up a fetch-module endpoint that can be used to fetch modules
 * from the client (running in isolation in an alternative runtime)
 *
 * Note: This could be implemented differently like via websockets or an rpc mechanism
 */
export function setupFetchModuleEndpoint(server: ViteDevServer) {
  if (setupFetchModuleEndpointExists) {
    return;
  }

  server.middlewares.use(async (request, resp, next) => {
    if (!request.url.startsWith(fetchModulePath)) {
      next();
      return;
    }

    const url = new URL(`http://localhost${request.url}`);

    const id = url.searchParams.get('id');
    const importer = url.searchParams.get('importer');

    const module = await server.ssrFetchModule(id, importer || undefined);

    resp.writeHead(200, { 'Content-Type': 'application/json' });
    resp.end(JSON.stringify(module));
  });

  setupFetchModuleEndpointExists = true;
}

export function getFetchModuleUrl(server: ViteDevServer): string {
  const serverAddress = server.httpServer.address();
  const serverBaseAddress =
    typeof serverAddress === 'string'
      ? serverAddress
      : `http://${!serverAddress.address.match(/:/) ? serverAddress.address : 'localhost'}:${serverAddress.port}`;

  const fetchModuleUrl = `${serverBaseAddress}${fetchModulePath}`;
  return fetchModuleUrl;
}

/**
 * Path used to set up a remote fetch-module mechanism, the vite dev server sets up a middleware
 * endpoint with such path allowing external users to fetch modules
 *
 * the client residing in the vm the uses this endpoint to gets modules remotely
 */
const fetchModulePath = '/__fetch-module__/' as const;
