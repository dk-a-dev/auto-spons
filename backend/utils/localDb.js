
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const USER_DB_PATH = path.join(__dirname, '../.userDb.json');
async function getUserDb() {
    try {
        const data = await fsPromises.readFile(USER_DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

async function saveUserDb(db) {
    await fsPromises.writeFile(USER_DB_PATH, JSON.stringify(db, null, 2));
}


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
  getTemplates,
  getUserDb,
  saveUserDb
};
