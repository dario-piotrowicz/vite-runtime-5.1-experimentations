import { serverSideRender } from './src/server/node';

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
