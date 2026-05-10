import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.onerror = function(msg, url, lineNo, columnNo, error) {
  alert('Error: ' + msg + '\nScript: ' + url + '\nLine: ' + lineNo);
  return false;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
