import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, Paper } from '@mui/material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const [config, setConfig] = useState({ host: '', port: '', user: '', pass: '', from: '', secure: false });

  const handleSubmit = async e => {
    e.preventDefault();
    setResult(null);
    try {
      if (mode === 'register') {
        const res = await axios.post(`${API_BASE_URL}/api/user/register`, { email, password, config });
        setResult({ success: true, message: 'Registered! Please login.' });
        setMode('login');
      } else {
        const res = await axios.post(`${API_BASE_URL}/api/user/login`, { email, password });
        localStorage.setItem('jwt', res.data.token);
        onAuth && onAuth(res.data.token, res.data.config);
        setResult({ success: true, message: 'Logged in!' });
      }
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.error || 'Auth failed.' });
    }
  };

  return (
    <Paper sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 3 }}>
      <Typography variant="h5" gutterBottom>{mode === 'login' ? 'Login' : 'Register'}</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} fullWidth margin="normal" required />
        <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth margin="normal" required />
        {mode === 'register' && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>SMTP Config (optional)</Typography>
            <TextField label="Host" value={config.host} onChange={e => setConfig(c => ({ ...c, host: e.target.value }))} fullWidth margin="normal" />
            <TextField label="Port" value={config.port} onChange={e => setConfig(c => ({ ...c, port: e.target.value }))} fullWidth margin="normal" />
            <TextField label="Username" value={config.user} onChange={e => setConfig(c => ({ ...c, user: e.target.value }))} fullWidth margin="normal" />
            <TextField label="Password" type="password" value={config.pass} onChange={e => setConfig(c => ({ ...c, pass: e.target.value }))} fullWidth margin="normal" />
            <TextField label="From Email" value={config.from} onChange={e => setConfig(c => ({ ...c, from: e.target.value }))} fullWidth margin="normal" />
          </>
        )}
        <Button type="submit" variant="contained" sx={{ mt: 2 }} fullWidth>{mode === 'login' ? 'Login' : 'Register'}</Button>
      </form>
      <Button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} sx={{ mt: 2 }} fullWidth>
        {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
      </Button>
      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 2 }}>{result.message}</Alert>
      )}
    </Paper>
  );
}
