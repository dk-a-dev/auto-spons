
import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://backend.auto-spons.orb.local';

export default function Configuration() {
  const [smtp, setSmtp] = useState({
    host: '',
    port: '',
    user: '',
    pass: '',
    from: '',
    secure: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [configStatus, setConfigStatus] = useState(null);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setSmtp(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/email/save-config`, smtp);
      setResult({ success: res.data.success, message: res.data.success ? 'Configuration saved.' : res.data.error });
      await checkConfigStatus();
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.error || 'Failed to save config.' });
    }
    setLoading(false);
  };

  const checkConfigStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/email/validate-config`);
      setConfigStatus(res.data.success ? 'Valid' : 'Invalid');
    } catch {
      setConfigStatus('Error');
    }
  };

  const handleTestEmail = async () => {
    setTestResult(null);
    if (!testEmail) {
      setTestResult({ success: false, message: 'Please enter a test email address.' });
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/email/test`, { testEmail });
      setTestResult({ success: res.data.success, message: res.data.success ? 'Test email sent!' : res.data.error });
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.error || 'Failed to send test email.' });
    }
    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 2 }}>
      <Typography variant="h5" gutterBottom>SMTP Configuration</Typography>
      <TextField label="Host" name="host" value={smtp.host} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Port" name="port" value={smtp.port} onChange={handleChange} fullWidth margin="normal" type="number" />
      <TextField label="Username" name="user" value={smtp.user} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Password" name="pass" value={smtp.pass} onChange={handleChange} fullWidth margin="normal" type="password" />
      <TextField label="From Email" name="from" value={smtp.from} onChange={handleChange} fullWidth margin="normal" />
      <Box sx={{ mt: 1 }}>
        <label>
          <input type="checkbox" name="secure" checked={smtp.secure} onChange={handleChange} />
          &nbsp;Use SSL/TLS (secure)
        </label>
      </Box>
      <Button variant="contained" sx={{ mt: 2 }} onClick={handleSaveConfig} disabled={loading}>
        {loading ? <CircularProgress size={24} /> : 'Save Configuration'}
      </Button>
      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 2 }}>
          {result.message}
        </Alert>
      )}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1">Config Status: <strong>{configStatus || 'Unknown'}</strong></Typography>
        <Button variant="outlined" sx={{ mt: 1 }} onClick={checkConfigStatus} disabled={loading}>Check Config Status</Button>
      </Box>
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6">Send Test Email</Typography>
        <TextField label="Test Email Address" value={testEmail} onChange={e => setTestEmail(e.target.value)} fullWidth margin="normal" />
        <Button variant="contained" onClick={handleTestEmail} disabled={loading || !testEmail} sx={{ mt: 1 }}>
          {loading ? <CircularProgress size={24} /> : 'Send Test Email'}
        </Button>
        {testResult && (
          <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
            {testResult.message}
          </Alert>
        )}
      </Box>
    </Box>
  );
}
