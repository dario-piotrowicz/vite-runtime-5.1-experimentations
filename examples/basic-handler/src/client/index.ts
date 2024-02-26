import { render as renderInputA } from './inputA.js';
import { render as renderInputB } from './inputB.js';

renderInputA();
renderInputB();

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', event => {
    if (event.type === 'update') {
      const updates = event.updates;
      const someServerUpdate = updates.some(update =>
        update.acceptedPath.match(/^\/src\/server/),
      );
      if (someServerUpdate) {
        location.reload();
      }
    }
  });
}
