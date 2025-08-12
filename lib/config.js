const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.tasknotes-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
  host: 'localhost',
  port: 8080,
  authToken: null,
  maxResults: 20
};

class Config {
  constructor() {
    this.ensureConfigDir();
    this.config = this.load();
  }

  ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  load() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const content = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(content);
        return { ...DEFAULT_CONFIG, ...config };
      }
    } catch (error) {
      console.warn('Warning: Could not load config file, using defaults');
    }
    
    return { ...DEFAULT_CONFIG };
  }

  save() {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Could not save config: ${error.message}`);
    }
  }

  get(key) {
    if (key) {
      return this.config[key];
    }
    return { ...this.config };
  }

  set(updates) {
    this.config = { ...this.config, ...updates };
    this.save();
  }

  reset() {
    this.config = { ...DEFAULT_CONFIG };
    this.save();
  }

  getConfigPath() {
    return CONFIG_FILE;
  }
}

// Export singleton instance
const configInstance = new Config();

module.exports = {
  get: (key) => configInstance.get(key),
  set: (updates) => configInstance.set(updates),
  reset: () => configInstance.reset(),
  getPath: () => configInstance.getConfigPath(),
  getAll: () => configInstance.get()
};