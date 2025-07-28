import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import EmailLogs from './components/EmailLogs';
import Configuration from './components/Configuration';
import Templates from './components/Templates';
import BulkEmail from './components/BulkEmail';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState(0);

  return (
    <Paper sx={{ minHeight: '100vh', borderRadius: 0 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Configuration" />
          <Tab label="Bulk Email" />
          <Tab label="Templates" />
          <Tab label="Email Logs" />
        </Tabs>
      </Box>
      <TabPanel value={tab} index={0}>
        <Configuration />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <BulkEmail />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <Templates />
      </TabPanel>
      <TabPanel value={tab} index={3}>
        <EmailLogs />
      </TabPanel>
    </Paper>
  );
}
