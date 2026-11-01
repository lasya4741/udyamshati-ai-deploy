import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App.jsx';
import './index.css';

// Configure Axios request interceptor to attach JWT token to all authenticated API requests
axios.interceptors.request.use((config) => {
  try {
    const sessionStr = localStorage.getItem('udyam_auth_session');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      if (session?.token) {
        config.headers.Authorization = `Bearer ${session.token}`;
      }
    }
  } catch (e) {
    // Ignore JSON parse errors for non-existent session
  }
  return config;
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
