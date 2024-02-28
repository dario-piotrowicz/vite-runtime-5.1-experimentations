import type { ViteDevServer } from 'vite';

export * from './fetchModule';

declare module 'vite' {
  interface ViteDevServer {
    registerServerRuntime: (
      runtimeIdentifier: string,
      factory: ServerRuntimeFactory,
    ) => void;
    createServerRuntime: (
      runtimeIdentifier: string,
      runtimeOptions?: Record<string, unknown>,
    ) => Promise<ServerRuntime>;
  }
}

type ServerRuntimeFactory = (
  runtimeOptions?: Record<string, unknown>,
) => Promise<ServerRuntime>;

export type ServerRuntime = {
  createRequestDispatcher: CreateRequestDispatcher;
};

export type CreateRequestDispatcher = (
  options: CreateRequestDispatcherOptions,
) => Promise<DispatchRequest>;

export type CreateRequestDispatcherOptions = {
  entrypoint: string;
};

export type DispatchRequest = (req: Request) => Response | Promise<Response>;

export function setupServerRuntimeRegistration(server: ViteDevServer) {
  const registerMap: Map<string, ServerRuntimeFactory> = new Map();

  server.registerServerRuntime ??= (
    runtimeIdentifier: string,
    factory: ServerRuntimeFactory,
  ) => {
    registerMap.set(runtimeIdentifier, factory);
  };

  server.createServerRuntime ??= (
    runtimeIdentifier: string,
    runtimeOptions?: Record<string, unknown>,
  ) => {
    const runtimeFactory = registerMap.get(runtimeIdentifier);
    if (!runtimeFactory) {
      return undefined;
    }
    return runtimeFactory(runtimeOptions);
  };
}
