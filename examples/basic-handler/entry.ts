/// <reference types="vite/client" />

import { serverSideRender } from './src/server/index.ts';

export default {
  async fetch(_request: Request) {
    const html = serverSideRender();
    return new Response(html, {
      headers: {
        'content-type': 'text/html',
      },
    });
  },
};
