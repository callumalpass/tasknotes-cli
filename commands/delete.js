const TaskNotesAPI = require('../lib/api');
const { showError, showSuccess, showInfo } = require('../lib/utils');
const ora = require('ora');
const chalk = require('chalk');

async function handler(taskId, options = {}) {
  if (!taskId) {
    showError('Task ID is required');
    showInfo('Example: tn delete "TaskNotes/Tasks/Buy groceries.md"');
    showInfo('Or:      tn delete task-123');
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
    // Get task info first to show what we're deleting
    const taskSpinner = ora('Fetching task details...').start();
    const task = await api.getTask(taskId);
    taskSpinner.succeed('Task found');

    if (!options.force) {
      console.log('\n' + chalk.bold('⚠️  Task to be deleted:'));
      console.log('─'.repeat(40));
      console.log(`${chalk.cyan('Title:')} ${task.title}`);
      console.log(`${chalk.cyan('Status:')} ${task.status || 'none'}`);
      if (task.priority) {
        console.log(`${chalk.cyan('Priority:')} ${task.priority}`);
      }
      if (task.due) {
        console.log(`${chalk.cyan('Due:')} ${task.due}`);
      }
      console.log(`${chalk.cyan('File:')} ${task.path || task.id}`);
      console.log('\n' + chalk.yellow('This action cannot be undone!'));
      console.log(chalk.dim('Use --force flag to skip confirmation'));
      
      // In a real implementation, you'd want to add confirmation prompt here
      showError('Task deletion requires --force flag for safety');
      process.exit(1);
    }

    // Delete the task
    const deleteSpinner = ora('Deleting task...').start();
    await api.deleteTask(taskId);
    deleteSpinner.succeed('Task deleted successfully');

    showSuccess(`Task "${task.title}" has been deleted`);
    
  } catch (error) {
    showError(`Failed to delete task: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { handler };