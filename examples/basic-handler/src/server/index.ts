import { getUserAgentText } from "./userAgent";
import { getCurrentTimeText } from "./time";

export function serverSideRender() {
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
            <span>${getCurrentTimeText()}</span>
          </div>
          <hr />
          <div id="app" style="padding-inline: 1.5rem;">
            <h1>Hello World</h1>
            <div id="input-a"></div>
            <br />
            <div id="input-b"></div>
          </div>
          <script type="module" src="../src/client/index.ts"></script>
        </body>
      </html>
    `;
    return html;
}