const config = require('../lib/config');
const TaskNotesAPI = require('../lib/api');
const { showSuccess, showError, showInfo, parseKeyValue, colors } = require('../lib/utils');
const ora = require('ora');

async function handler(options = {}) {
  try {
    if (options.set) {
      // Set a configuration value
      const { key, value } = parseKeyValue(options.set);
      
      // Validate known keys
      const validKeys = ['host', 'port', 'authToken', 'dateFormat', 'timeFormat', 'defaultPriority', 'maxResults'];
      if (!validKeys.includes(key)) {
        showError(`Unknown configuration key: ${key}`);
        showInfo(`Valid keys: ${validKeys.join(', ')}`);
        process.exit(1);
      }
      
      // Type conversion for specific keys
      let processedValue = value;
      if (key === 'port' || key === 'maxResults') {
        processedValue = parseInt(value);
        if (isNaN(processedValue)) {
          showError(`${key} must be a number`);
          process.exit(1);
        }
      }
      
      config.set({ [key]: processedValue });
      showSuccess(`Set ${key} = ${processedValue}`);
      
      // Test connection if setting host/port
      if (key === 'host' || key === 'port') {
        const spinner = ora('Testing connection...').start();
        const api = new TaskNotesAPI();
        try {
          await api.health();
          spinner.succeed('Connection successful!');
        } catch (error) {
          spinner.fail('Connection failed');
          showError(error.message);
        }
      }
      
    } else if (options.get) {
      // Get a configuration value
      const value = config.get(options.get);
      if (value !== undefined) {
        console.log(`${options.get} = ${value}`);
      } else {
        showError(`Configuration key not found: ${options.get}`);
        process.exit(1);
      }
      
    } else if (options.list) {
      // List all configuration
      const allConfig = config.getAll();
      console.log('Current configuration:');
      console.log('─'.repeat(30));
      
      Object.entries(allConfig).forEach(([key, value]) => {
        const displayValue = key === 'authToken' && value ? '***hidden***' : value;
        console.log(`${colors.highlight(key.padEnd(15))} ${displayValue}`);
      });
      
      console.log(`\nConfig file: ${colors.dim(config.getPath())}`);
      
    } else {
      // Interactive configuration setup
      await interactiveSetup();
    }
    
  } catch (error) {
    showError(error.message);
    process.exit(1);
  }
}

async function interactiveSetup() {
  const inquirer = require('inquirer');
  const currentConfig = config.getAll();
  
  console.log('TaskNotes CLI Configuration Setup');
  console.log('─'.repeat(35));
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'host',
      message: 'TaskNotes API host:',
      default: currentConfig.host
    },
    {
      type: 'number',
      name: 'port',
      message: 'TaskNotes API port:',
      default: currentConfig.port
    },
    {
      type: 'password',
      name: 'authToken',
      message: 'API authentication token (optional):',
      default: currentConfig.authToken
    },
    {
      type: 'list',
      name: 'defaultPriority',
      message: 'Default task priority:',
      choices: ['low', 'medium', 'high'],
      default: currentConfig.defaultPriority
    },
    {
      type: 'number',
      name: 'maxResults',
      message: 'Maximum results to show:',
      default: currentConfig.maxResults
    }
  ]);
  
  // Filter out empty auth token
  if (!answers.authToken || answers.authToken.trim() === '') {
    answers.authToken = null;
  }
  
  config.set(answers);
  showSuccess('Configuration saved!');
  
  // Test the connection
  const spinner = ora('Testing connection to TaskNotes API...').start();
  const api = new TaskNotesAPI();
  
  try {
    await api.health();
    spinner.succeed('Successfully connected to TaskNotes API!');
    showInfo('You can now use TaskNotes CLI commands');
  } catch (error) {
    spinner.fail('Could not connect to TaskNotes API');
    showError(error.message);
    showInfo('Please check your settings and make sure TaskNotes is running with API enabled');
  }
}

module.exports = { handler };