// index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Fonte Playfair Display + DM Sans (identidade visual Amaral Barbearia)
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap';
document.head.appendChild(link);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
