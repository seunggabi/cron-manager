import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/config'
import App from './App.tsx'
import { LogViewer } from './components/LogViewer.tsx'

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');

if (mode === 'logviewer') {
  const logPath = params.get('logPath') || '';
  const workingDir = params.get('workingDir') || undefined;

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <LogViewer logPath={logPath} workingDir={workingDir} onClose={() => window.close()} fullScreen />
    </StrictMode>,
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
