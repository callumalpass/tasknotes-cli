const TaskNotesAPI = require('../lib/api');
const { showError, showSuccess, showInfo } = require('../lib/utils');
const ora = require('ora');
const chalk = require('chalk');

async function handler(taskId, options = {}) {
  if (!taskId) {
    showError('Task ID is required');
    showInfo('Example: tn toggle "TaskNotes/Tasks/Buy groceries.md"');
    showInfo('Or:      tn toggle task-123');
    process.exit(1);
  }

  const api = new TaskNotesAPI();
  
  // Test connection
  const spinner = ora('Connecting to TaskNotes...').start();
  const connected = await api.testConnection();
  if (!connected) {
    spinner.fail('Cannot connect to TaskNotes API');
    showError('Make sure TaskNotes is running with API enabled');
    process.exit(1);
  }
  spinner.succeed('Connected to TaskNotes');

  try {
    // Get task info first to show current status
    const taskSpinner = ora('Fetching task details...').start();
    const originalTask = await api.getTask(taskId);
    taskSpinner.succeed('Task found');

    console.log('\n' + chalk.bold('Current task:'));
    console.log('─'.repeat(30));
    console.log(`${chalk.cyan('Title:')} ${originalTask.title}`);
    console.log(`${chalk.cyan('Status:')} ${originalTask.status || 'none'}`);

    // Toggle the status
    const toggleSpinner = ora('Toggling task status...').start();
    const updatedTask = await api.toggleTaskStatus(taskId);
    toggleSpinner.succeed('Task status toggled');

    if (options.json) {
      console.log(JSON.stringify(updatedTask, null, 2));
      return;
    }

    console.log('\n' + chalk.bold('✅ Task status updated:'));
    console.log('─'.repeat(30));
    console.log(`${chalk.cyan('Title:')} ${updatedTask.title}`);
    console.log(`${chalk.cyan('Previous status:')} ${originalTask.status || 'none'}`);
    console.log(`${chalk.cyan('New status:')} ${updatedTask.status || 'none'}`);
    
    if (originalTask.status !== updatedTask.status) {
      const statusChange = `${originalTask.status || 'none'} → ${updatedTask.status || 'none'}`;
      showSuccess(`Status changed: ${statusChange}`);
    } else {
      showInfo('Task status remained the same');
    }
    
  } catch (error) {
    showError(`Failed to toggle task status: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { handler };