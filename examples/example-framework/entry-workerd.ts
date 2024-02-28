/// <reference types="vite/client" />

import { serverSideRender } from './src/server/workerd';

export default {
  async fetch(_request: Request, env: Env) {
    const html = await serverSideRender(env);

    return new Response(html, {
      headers: {
        'content-type': 'text/html',
      },
    });
  },
};
