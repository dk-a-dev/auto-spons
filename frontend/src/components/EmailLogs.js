import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const statusColor = {
  sent: 'success',
  failed: 'error',
};

export default function EmailLogs({ jwt }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/email/logs`, {
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}
    }).then(res => {
      setLogs(res.data.logs || []);
      setLoading(false);
    });
  }, [jwt]);

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', mt: 2 }}>
      <Typography variant="h4" gutterBottom>Email Send History</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Error</TableCell>
              <TableCell>Contact Name</TableCell>
              <TableCell>Contact Company</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8}>Loading...</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={8}>No logs found.</TableCell></TableRow>
            ) : logs.slice().reverse().map((log, idx) => (
              <TableRow key={idx}>
                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                <TableCell>{log.type}</TableCell>
                <TableCell>{log.to}</TableCell>
                <TableCell>{log.subject}</TableCell>
                <TableCell><Chip label={log.status} color={statusColor[log.status] || 'default'} size="small" /></TableCell>
                <TableCell>{log.error || ''}</TableCell>
                <TableCell>{log.contactName || ''}</TableCell>
                <TableCell>{log.contactCompany || ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
