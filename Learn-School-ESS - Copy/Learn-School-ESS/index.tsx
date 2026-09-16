import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';


console.log = console.info = console.debug = console.warn = console.error = 
console.table = console.dir = console.trace = console.time = console.timeEnd = () => {};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);