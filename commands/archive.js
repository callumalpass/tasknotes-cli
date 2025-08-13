const TaskNotesAPI = require('../lib/api');
const { showError, showSuccess, showInfo } = require('../lib/utils');
const ora = require('ora');
const chalk = require('chalk');

async function handler(taskId, options = {}) {
  if (!taskId) {
    showError('Task ID is required');
    showInfo('Example: tn archive "TaskNotes/Tasks/Buy groceries.md"');
    showInfo('Or:      tn archive task-123');
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
    console.log(`${chalk.cyan('Archived:')} ${originalTask.archived ? 'Yes' : 'No'}`);

    // Toggle the archive status
    const archiveSpinner = ora('Toggling archive status...').start();
    const updatedTask = await api.toggleArchive(taskId);
    archiveSpinner.succeed('Archive status toggled');

    if (options.json) {
      console.log(JSON.stringify(updatedTask, null, 2));
      return;
    }

    console.log('\n' + chalk.bold('📦 Task archive status updated:'));
    console.log('─'.repeat(40));
    console.log(`${chalk.cyan('Title:')} ${updatedTask.title}`);
    console.log(`${chalk.cyan('Previously archived:')} ${originalTask.archived ? 'Yes' : 'No'}`);
    console.log(`${chalk.cyan('Now archived:')} ${updatedTask.archived ? 'Yes' : 'No'}`);
    
    if (originalTask.archived !== updatedTask.archived) {
      if (updatedTask.archived) {
        showSuccess('Task has been archived');
      } else {
        showSuccess('Task has been unarchived');
      }
    } else {
      showInfo('Archive status remained the same');
    }
    
  } catch (error) {
    showError(`Failed to toggle archive status: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { handler };