import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from '@remix-run/cloudflare';
import { Form, json, useLoaderData } from '@remix-run/react';

export const meta: MetaFunction = () => {
  return [
    { title: 'New Remix App' },
    {
      name: 'description',
      content: 'Welcome to Remix! Using Vite and Cloudflare!',
    },
  ];
};

function getUserAgentText(): string {
  if (typeof navigator === 'undefined') {
    return 'navigator is undefined (running in Node.js?)';
  } else {
    const userAgent = navigator.userAgent;
    return `navigator.userAgent = ${userAgent}`;
  }
}

const key = '__my-key__';

export async function loader({ context }: LoaderFunctionArgs) {
  const { MY_KV } = context.cloudflare.env;
  const value = await MY_KV.get(key);
  return json({ value, userAgentText: getUserAgentText() });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { MY_KV: myKv } = context.cloudflare.env;

  if (request.method === 'POST') {
    const formData = await request.formData();
    const value = formData.get('value') as string;
    await myKv.put(key, value);
    return null;
  }

  if (request.method === 'DELETE') {
    await myKv.delete(key);
    return null;
  }

  throw new Error(`Method not supported: "${request.method}"`);
}

export default function Index() {
  const { userAgentText, value } = useLoaderData<typeof loader>();

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.8' }}>
      <h1>Welcome to Remix (with Vite and Cloudflare)</h1>
      <hr />
      <h2>{userAgentText}</h2>
      <hr />
      <h2>KV Usage example</h2>
      {value ? (
        <>
          <p>Value: {value}</p>
          <Form method="DELETE">
            <button>Delete</button>
          </Form>
        </>
      ) : (
        <>
          <p>No value</p>
          <Form method="POST">
            <label htmlFor="value">Set value: </label>
            <input type="text" name="value" id="value" required />
            <br />
            <button>Save</button>
          </Form>
        </>
      )}
    </div>
  );
}
