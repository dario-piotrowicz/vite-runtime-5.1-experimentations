# Remix App Node Example

This example shows how a Remix application can be locally fully server side rendered using our Node.js runtime implementation.

To run the application simply run:

```sh
$ pnpm dev
```

> [!NOTE]
>
> To make this work changes had to be made in the `@remix-run/dev` package, those are applied with a pnpm patch
>
> you can see the source code used to generate such patch here: https://github.com/dario-piotrowicz/remix/tree/vite-runtime-5.1-experimentations-with-node

> [!WARNING]
>
> Note that `remix vite:dev` has to be run with `NODE_OPTIONS='--experimental-vm-modules'`, that is because in the `@remix-run/dev` package the
> `node-dev-entrypoint.ts` file has been written by hand and is not bundled causing the need to have dynamic imports.
>
> Ideally the file should be bundled and the option should no longer be necessary.
