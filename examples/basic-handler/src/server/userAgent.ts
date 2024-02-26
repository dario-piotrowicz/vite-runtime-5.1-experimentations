if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log(
      `\x1b[31mThis console.log is never triggered (i.e there's no SSR HMR)\x1b[0m`,
    );
  });
}

export function getUserAgentText(): string {
  if (typeof navigator === 'undefined') {
    return 'navigator is undefined (running in Node.js?)';
  } else {
    const userAgent = navigator.userAgent;
    return `navigator.userAgent = ${userAgent}`;
  }
}
