import { getUserAgentText } from './userAgent';
import { getCurrentTimeText } from './time';
import { getCount } from './counter';

export async function serverSideRender(env: Record<string, unknown>) {
  const html = `
    <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <link rel="icon" type="image/svg+xml" href="src/favicon.svg" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Vite App</title>
          <style>
            body {
                margin: 0;
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; padding: 0.25rem; margin-block: 0.15rem">
            <span>${getUserAgentText()}</span>
            <span>Count: ${await getCount(env.MY_KV_NAMESPACE)}</span>
            <span>${getCurrentTimeText()}</span>
          </div>
          <hr />
          <div id="app" style="padding-inline: 1.5rem;">
            <h1>Hello World</h1>
            <div id="input-a-wrapper"></div>
            <br />
            <div id="input-b-wrapper"></div>
          </div>
          <script type="module" src="../src/client/index.ts"></script>
        </body>
      </html>
    `;
  return html;
}
