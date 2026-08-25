import {StrictMode} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import {initTracker} from './lib/tracker';

initTracker();

const container = document.getElementById('root')!;

const tree = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Production builds are pre-rendered, so the markup is already there and we
// hydrate it. The dev server has no SSR step, so there is nothing to hydrate
// and we mount normally — hydrating an empty container would warn on every
// route and throw the tree away.
if (container.dataset.prerendered === 'true') {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
