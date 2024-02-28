export async function getCount(kv: KVNamespace) {
  const count = parseInt((await kv.get('counter')) ?? '0');
  await kv.put('counter', String(count + 1));
  return count;
}
