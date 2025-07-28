import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import EmailLogs from './components/EmailLogs';
import Configuration from './components/Configuration';
import Templates from './components/Templates';
import BulkEmail from './components/BulkEmail';
import Auth from './components/Auth';

export default function App() {
  const [tab, setTab] = useState(0);
  const [jwt, setJwt] = useState(localStorage.getItem('jwt') || '');
  const [userConfig, setUserConfig] = useState(null);

  const handleAuth = (token, config) => {
    setJwt(token);
    setUserConfig(config);
    localStorage.setItem('jwt', token);
  };

  const handleLogout = () => {
    setJwt('');
    setUserConfig(null);
    localStorage.removeItem('jwt');
    setTab(0);
  };

  if (!jwt) {
    return <Auth onAuth={handleAuth} />;
  }

  return (
    <Paper sx={{ minHeight: '100vh', borderRadius: 0 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 2, display: 'flex', alignItems: 'center' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Configuration" />
          <Tab label="Bulk Email" />
          <Tab label="Templates" />
          <Tab label="Email Logs" />
        </Tabs>
        <Box sx={{ flexGrow: 1 }} />
        <button onClick={handleLogout} style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 4, border: 'none', background: '#e53935', color: '#fff', cursor: 'pointer' }}>Logout</button>
      </Box>
      {tab === 0 && <Configuration jwt={jwt} userConfig={userConfig} />}
      {tab === 1 && <BulkEmail jwt={jwt} userConfig={userConfig} />}
      {tab === 2 && <Templates jwt={jwt} userConfig={userConfig} />}
      {tab === 3 && <EmailLogs jwt={jwt} />}
    </Paper>
  );
}
