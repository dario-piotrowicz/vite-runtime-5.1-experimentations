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
examples/basic-handler
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
