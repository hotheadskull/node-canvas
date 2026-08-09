import React from 'react';
import ReactDOM from 'react-dom/client';
// Observatory type stack (docs/design/observatory) -- bundled, not fetched:
// the desktop app must render identically offline.
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/400-italic.css';
import '@fontsource/space-mono/400.css';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
