import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const style = document.createElement('style');
style.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1117; color: #f9fafb; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #111827; }
  ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
  input:focus { border-color: #4ade80 !important; }
  button:hover { opacity: 0.85; transform: scale(1.01); }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
