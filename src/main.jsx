import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './assets/global.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId="640348187758-vtlh95qtfc4edjtvst9bra0a0svc7e7n.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);
