const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserDb, saveUserDb } = require('../utils/localDb.js');
const crypto = require('crypto');

const ENC_SECRET = process.env.ENC_SECRET || 'encryptionkey123';
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENC_SECRET.padEnd(32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}
function decrypt(text) {
  const [ivHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENC_SECRET.padEnd(32)), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Register endpoint
router.post('/register', async (req, res) => {
    const { email, password, config } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
    const users = await getUserDb();
    if (users[email]) return res.status(409).json({ error: 'User already exists.' });
    const hash = await bcrypt.hash(password, 10);
    let safeConfig = { ...config };
    if (safeConfig && safeConfig.pass) safeConfig.pass = encrypt(safeConfig.pass);
    users[email] = { password: hash, config: safeConfig || {} };
    await saveUserDb(users);
    res.json({ success: true });
});

// Login endpoint
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
    const users = await getUserDb();
    const user = users[email];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
    let safeConfig = { ...user.config };
    if (safeConfig && safeConfig.pass) {
      try { safeConfig.pass = decrypt(safeConfig.pass); } catch {}
    }
    res.json({ token, config: safeConfig });
});

// Get user config (protected)
router.get('/config', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token.' });
    try {
        const { email } = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
        const users = await getUserDb();
        const user = users[email];
        if (!user) return res.status(404).json({ error: 'User not found.' });
        let safeConfig = { ...user.config };
        if (safeConfig && safeConfig.pass) {
          try { safeConfig.pass = decrypt(safeConfig.pass); } catch {}
        }
        res.json({ config: safeConfig });
    } catch (e) {
        res.status(401).json({ error: 'Invalid token.' });
    }
});

// Update user config (protected)
router.post('/config', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token.' });
    try {
        const { email } = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
        const users = await getUserDb();
        const user = users[email];
        if (!user) return res.status(404).json({ error: 'User not found.' });
        let safeConfig = { ...req.body.config };
        if (safeConfig && safeConfig.pass) safeConfig.pass = encrypt(safeConfig.pass);
        user.config = safeConfig || {};
        await saveUserDb(users);
        res.json({ success: true });
    } catch (e) {
        res.status(401).json({ error: 'Invalid token.' });
    }
});

module.exports = router;
