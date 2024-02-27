# Vite Runtime Node Plugin

Plugin that using [Node's `vm` module](https://nodejs.org/api/vm.html) and the Vite Runtime API allows javascript code to be run inside a `vm` context.

This is significantly different from [`createViteRuntime`](https://vitejs.dev/guide/api-vite-runtime#createviteruntime), since the latter runs JS code in the same Node.js process the Vite Dev Server runs in whilst our implementation, using the `vm` module, tries to make such JS code run in a (sufficiently) isolated environment.
