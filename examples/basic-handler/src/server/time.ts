if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // It would be very convenient here if we'd have a simple
    // clear way to communicate with the browser and instruct
    // it to do a full page reload or whatever else that might
    // be appropriate for handling the server changes
    console.log('__server/time has changed (SSR HMR is working!)__');
  });
}

export function getCurrentTimeText(): string {
  return new Date().toLocaleString();
}
