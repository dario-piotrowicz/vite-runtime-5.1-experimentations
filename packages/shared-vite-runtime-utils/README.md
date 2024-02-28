# Shared Vite Runtime Utils

Sets up code that is used by the other runtime plugins

The code in this package could, in a form or another be baked-in into Vite itself since it contains logic that is very likely going to be necessary to all type of runtime plugins

Such code is:

- The `SSRRuntime` types

  Types of the `ssrRuntime` that this repo is proposing to adopt.

- Module fetching utilities

  Every runtime plugin is going to require a way to remotely fetch modules (for their [`fetchModule` function](https://vitejs.dev/guide/api-vite-runtime#viteruntimeoptions)).

  We've seen that existing experimentations do this by themselves via rpc.

  In this repository we've opted for a simpler approach, which consists of simply having the Vite Dev Server expose an endpoint that can be fetched from externally and which provides modules' contents.

  Regardless on the implementation, we think that a baked-in solution for this basic/common/shared issue could/should be baked-in into Vite itself instead of requiring all plugins using the Vite Runtime API to reinvent their own solution every single time.
