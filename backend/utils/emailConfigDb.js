const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../data/emailConfig.json');

function ensureFile(filePath, defaultValue = {}) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

function readConfig() {
  ensureFile(CONFIG_FILE);
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function saveConfig(config) {
  writeConfig(config);
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

module.exports = {
  readConfig,
  saveConfig,
};
