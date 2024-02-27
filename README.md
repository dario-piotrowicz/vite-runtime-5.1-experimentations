# Vite Runtime 5.1 experimentations

Experimentations based on the [_experimental_ Vite Runtime API](https://vitejs.dev/guide/api-vite-runtime) introduced in Vite 5.1

## Setup

Simply run:

```sh
$ pnpm i
```

to install all the dependencies and build all the packages in this repository

You can then go to:

```
examples/example-framework
```

and run

```sh
$ pnpm dev:node
```

to run the example using a vm Node.js based runtime

or

```sh
$ pnpm dev:workerd
```

to run the example using the Workerd runtime instead

## Credits & References

- [**vite-node-miniflare** (by _hi-ogawa_)](https://github.com/hi-ogawa/vite-plugins/blob/ba5d995046cffc0fd368dd3c3a4d05f9d2db29dc/packages/vite-node-miniflare)
- [**vite-envs** (by _sapphi-red_)](https://github.com/sapphi-red/vite-envs/tree/7f76892b7d28f0da06826f43953cedb5b2f042c5)
- [**hydrogen vite** (by _frandiox_)](https://github.com/Shopify/hydrogen/pull/1728)
