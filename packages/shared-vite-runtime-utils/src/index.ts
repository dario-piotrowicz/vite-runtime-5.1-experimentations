export * from './fetchModule';

declare module 'vite' {
  interface ViteDevServer {
    /**
     * Note: ssrRuntime needs to be promise-based because in the plugin's `configureServer`
     *       we need to wait until the Vite dev server Http server is ready in order to get
     *       its address and pass it to the alternative runtime
     */
    ssrRuntime$: Promise<SSRRuntime>;
  }
}

export type SSRRuntime = {
  createRequestDispatcher: CreateRequestDispatcher;
};

export type CreateRequestDispatcher = (
  options: CreateRequestDispatcherOptions,
) => Promise<DispatchRequest>;

export type CreateRequestDispatcherOptions = {
  entrypoint: string;
};

export type DispatchRequest = (req: Request) => Response | Promise<Response>;
