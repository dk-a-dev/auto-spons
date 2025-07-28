import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, TextField, Alert, MenuItem, CircularProgress } from '@mui/material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function BulkEmail({ jwt }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [subject, setSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [placeholders, setPlaceholders] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/email/templates`, {
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}
      });
      setTemplates(res.data.templates || []);
    } catch {
      setTemplates([]);
    }
  };

  const handleFileChange = e => {
    setCsvFile(e.target.files[0] || null);
  };

  // When template changes, update preview and subject
  useEffect(() => {
    const tpl = templates.find(t => t.id === selectedTemplate);
    setTemplateBody(tpl?.body || '');
    if (tpl) setSubject(tpl.subject);
    setPlaceholders(extractPlaceholders(tpl?.body || ''));
    // eslint-disable-next-line
  }, [selectedTemplate]);

  // Extract placeholders from template body
  function extractPlaceholders(body) {
    if (!body) return [];
    const matches = [...body.matchAll(/\{([a-zA-Z0-9_]+)\}/g)];
    return Array.from(new Set(matches.map(m => m[1])));
  }

  const handleSend = async () => {
    if (!csvFile || !selectedTemplate || !subject) {
      setResult({ success: false, message: 'CSV file, template, and subject are required.' });
      return;
    }
    setSending(true);
    setResult(null);
    const formData = new FormData();
    formData.append('csvFile', csvFile);
    formData.append('template', templates.find(t => t.id === selectedTemplate)?.body || '');
    formData.append('subject', subject);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/email/bulk-send`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: jwt ? `Bearer ${jwt}` : undefined
        }
      });
      setResult({ success: res.data.success, message: res.data.message || 'Bulk email sent.', details: res.data });
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.error || 'Bulk email failed.' });
    }
    setSending(false);
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 2 }}>
      <Typography variant="h4" gutterBottom>Bulk Email Sender</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          select
          label="Select Template"
          value={selectedTemplate}
          onChange={e => setSelectedTemplate(e.target.value)}
          fullWidth
          margin="normal"
        >
          {templates.map(tpl => (
            <MenuItem key={tpl.id} value={tpl.id}>{tpl.subject}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Email Subject"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          fullWidth
          margin="normal"
        />
        {templateBody && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Template Preview:</Typography>
            <Paper sx={{ p: 2, background: '#f9f9f9', mt: 1 }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{templateBody}</pre>
            </Paper>
          </Box>
        )}
        {placeholders.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Supported Placeholders:</Typography>
            <ul>
              {placeholders.map(ph => <li key={ph}>{`{${ph}}`}</li>)}
            </ul>
          </Box>
        )}
        <Button variant="outlined" component="label" sx={{ mt: 2 }}>
          Upload CSV File
          <input type="file" accept=".csv" hidden onChange={handleFileChange} />
        </Button>
        {csvFile && <Typography sx={{ mt: 1 }}>Selected file: {csvFile.name}</Typography>}
        <Button variant="contained" sx={{ mt: 3 }} onClick={handleSend} disabled={sending || !csvFile || !selectedTemplate || !subject}>
          {sending ? <CircularProgress size={24} /> : 'Send Bulk Email'}
        </Button>
        {result && (
          <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 2 }}>
            {result.message}
          </Alert>
        )}
      </Paper>
      {result?.details?.results && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6">Send Results</Typography>
          <ul>
            {result.details.results.map((r, i) => (
              <li key={i}>
                <b>{r.to}</b>: {r.success ? 'Sent' : `Failed (${r.error})`}
                {r.subject && <span> | Subject: {r.subject}</span>}
              </li>
            ))}
          </ul>
        </Paper>
      )}
    </Box>
  );
}
