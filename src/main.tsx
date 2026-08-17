import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import '@/styles/tokens.css';
import '@/styles/global.css';
import '@/styles/components.css';
import '@/styles/shell.css';
import '@/styles/auth.css';
import '@/styles/home.css';
import '@/styles/event-overview.css';
import '@/styles/guests.css';
import '@/styles/functions.css';
import '@/styles/expenses.css';
import '@/styles/vendors.css';
import '@/styles/tasks.css';
import '@/styles/people.css';
import '@/styles/event-creation.css';
import '@/styles/invitation-accept.css';
import '@/styles/profile.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
