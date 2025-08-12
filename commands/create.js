const TaskNotesAPI = require('../lib/api');
const { showSuccess, showError, formatPreview } = require('../lib/utils');
const ora = require('ora');

async function handler(text) {
  if (!text || !text.trim()) {
    showError('Please provide task text');
    process.exit(1);
  }

  const api = new TaskNotesAPI();
  const spinner = ora('Creating task...').start();

  try {
    // Test connection first
    const connected = await api.testConnection();
    if (!connected) {
      spinner.fail('Cannot connect to TaskNotes API');
      showError('Make sure TaskNotes is running with API enabled');
      
      // Try to auto-discover
      spinner.start('Searching for TaskNotes API...');
      try {
        const discovered = await api.autoDiscover();
        spinner.succeed(`Found TaskNotes API at ${discovered.host}:${discovered.port}`);
        showSuccess('Configuration updated automatically');
      } catch (error) {
        spinner.fail('Could not find TaskNotes API');
        showError('Please check your configuration with: tn config');
        process.exit(1);
      }
    }

    // Create the task
    spinner.text = 'Parsing and creating task...';
    const result = await api.createTask(text);
    
    spinner.succeed('Task created successfully!');
    
    // Show what was created
    console.log('\nCreated task:');
    console.log(`  Title: ${result.task.title}`);
    console.log(`  File: ${result.task.filePath || result.task.id}`);
    
    if (result.parsed) {
      console.log('\nParsed fields:');
      console.log(formatPreview(result.parsed));
    }

  } catch (error) {
    spinner.fail('Failed to create task');
    showError(error.message);
    process.exit(1);
  }
}

module.exports = { handler };