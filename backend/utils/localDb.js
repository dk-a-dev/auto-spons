const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../data/emailLogs.json');
const TEMPLATE_FILE = path.join(__dirname, '../data/emailTemplates.json');

function ensureFile(filePath, defaultValue = []) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

function readJson(filePath) {
  ensureFile(filePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Email Logs
function addEmailLog(log) {
  const logs = readJson(LOG_FILE);
  logs.push({ ...log, timestamp: new Date().toISOString() });
  writeJson(LOG_FILE, logs);
}

function getEmailLogs() {
  return readJson(LOG_FILE);
}

// Templates
function saveTemplate(template) {
  const templates = readJson(TEMPLATE_FILE);
  const idx = templates.findIndex(t => t.id === template.id);
  if (idx >= 0) {
    templates[idx] = template;
  } else {
    templates.push(template);
  }
  writeJson(TEMPLATE_FILE, templates);
}

function getTemplates() {
  return readJson(TEMPLATE_FILE);
}

module.exports = {
  addEmailLog,
  getEmailLogs,
  saveTemplate,
  getTemplates
};
