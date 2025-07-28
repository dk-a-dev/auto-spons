import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Alert, List, ListItem, ListItemText, Divider, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Templates({ jwt }) {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState({ id: '', subject: '', body: '' });
  const [message, setMessage] = useState(null);
  const [customFields, setCustomFields] = useState({});
  const [loading, setLoading] = useState(false);
  const [guide, setGuide] = useState(null);

  useEffect(() => {
    fetchTemplates();
    fetchGuide();
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

  const fetchGuide = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/email/template-guide`, {
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}
      });
      setGuide(res.data.data);
    } catch {
      setGuide(null);
    }
  };

  const handleSelect = (tpl) => {
    setSelected(tpl.id);
    setEdit({ ...tpl });
    setMessage(null);
    setCustomFields(getTemplateFields(tpl.body));
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setEdit(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await axios.post(`${API_BASE_URL}/api/email/save-template`, edit, {
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}
      });
      setMessage({ type: 'success', text: 'Template saved.' });
      fetchTemplates();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save template.' });
    }
    setLoading(false);
  };

  const handleNew = () => {
    setSelected(null);
    setEdit({ id: '', subject: '', body: '' });
    setMessage(null);
    setCustomFields({});
  };
  // Extract custom fields from template body
  function getTemplateFields(body) {
    if (!body) return {};
    const matches = [...body.matchAll(/\{([a-zA-Z0-9_]+)\}/g)];
    const fields = {};
    matches.forEach(m => {
      const key = m[1];
      if (!fields[key]) fields[key] = '';
    });
    return fields;
  }

  // Handle custom field input change
  const handleCustomFieldChange = (e) => {
    const { name, value } = e.target;
    setCustomFields(prev => ({ ...prev, [name]: value }));
  };
  // Delete template handler
  const handleDelete = async () => {
    if (!selected) return;
    setLoading(true);
    setMessage(null);
    try {
      await axios.delete(`${API_BASE_URL}/api/email/delete-template/${selected}`, {
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}
      });
      setMessage({ type: 'success', text: 'Template deleted.' });
      fetchTemplates();
      handleNew();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete template.' });
    }
    setLoading(false);
  };

  // Simple preview: replace placeholders with example values
  const getPreview = () => {
    let preview = edit.body;
    if (!preview) return '';
    if (guide) {
      // Replace person placeholders
      guide.personPlaceholders.forEach(ph => {
        const [curly, square] = ph.split(' or ');
        preview = preview.replaceAll(curly, 'John').replaceAll(square, 'John');
      });
      // Replace company placeholders
      guide.companyPlaceholders.forEach(ph => {
        const [curly, square] = ph.split(' or ');
        preview = preview.replaceAll(curly, 'Acme Corp').replaceAll(square, 'Acme Corp');
      });
      // Replace custom placeholders
      guide.customPlaceholders.forEach(ph => {
        const square = ph.split(' - ')[0];
        preview = preview.replaceAll(square, 'Example');
      });
    }
    return preview;
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 2 }}>
      <Typography variant="h4" gutterBottom>Email Templates</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Button variant="outlined" onClick={handleNew} sx={{ mb: 2 }}>New Template</Button>
        <List>
          {templates.map(tpl => (
            <React.Fragment key={tpl.id}>
              <ListItem button selected={selected === tpl.id} onClick={() => handleSelect(tpl)}>
                <ListItemText primary={tpl.subject} secondary={tpl.id} />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">{selected ? 'Edit Template' : 'Create New Template'}</Typography>
        <TextField label="Template ID" name="id" value={edit.id} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Subject" name="subject" value={edit.subject} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Body" name="body" value={edit.body} onChange={handleChange} fullWidth margin="normal" multiline rows={8} />
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button variant="contained" onClick={handleSave} disabled={loading || !edit.id || !edit.subject || !edit.body}>
            {loading ? 'Saving...' : 'Save Template'}
          </Button>
          {selected && (
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete} disabled={loading}>
              Delete
            </Button>
          )}
        </Box>
        {Object.keys(customFields).length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1">Custom Fields:</Typography>
            {Object.keys(customFields).map((field, i) => (
              <TextField
                key={field}
                label={field}
                name={field}
                value={customFields[field]}
                onChange={handleCustomFieldChange}
                fullWidth
                margin="normal"
              />
            ))}
          </Box>
        )}
        {message && (
          <Alert severity={message.type} sx={{ mt: 2 }}>{message.text}</Alert>
        )}
        {guide && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1">Supported Placeholders:</Typography>
            <ul>
              {guide.personPlaceholders.map((ph, i) => <li key={i}>{ph}</li>)}
              {guide.companyPlaceholders.map((ph, i) => <li key={i}>{ph}</li>)}
              {guide.customPlaceholders.map((ph, i) => <li key={i}>{ph}</li>)}
            </ul>
          </Box>
        )}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1">Preview:</Typography>
          <Paper sx={{ p: 2, background: '#f9f9f9', mt: 1 }}>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{getPreview()}</pre>
          </Paper>
        </Box>
      </Paper>
    </Box>
  );
}
