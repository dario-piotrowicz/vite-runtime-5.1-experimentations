if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // It would be very convenient here if we'd have a simple
    // clear way to communicate with the browser and instruct
    // it to do a full page reload or whatever else that might
    // be appropriate for handling the server changes
    console.log('__server/userAgent has changed (SSR HMR is working!)__');
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
