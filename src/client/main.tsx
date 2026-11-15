import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles.css';
import { applyTheme, defaultTheme } from './world/themes';

// Set the colours before React renders anything, so the first paint is already
// themed. Theme choice and saving it come later (Phase 4); for now there is one.
applyTheme(document.documentElement, defaultTheme);

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
