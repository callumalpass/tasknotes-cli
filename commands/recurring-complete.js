const TaskNotesAPI = require('../lib/api');
const { showError, showSuccess, showInfo } = require('../lib/utils');
const ora = require('ora');
const chalk = require('chalk');

async function handler(taskId, instanceDate, options = {}) {
  if (!taskId) {
    showError('Task ID is required');
    showInfo('Example: tn recurring-complete "recurring-task-123" "2025-08-13"');
    process.exit(1);
  }

  if (!instanceDate) {
    showError('Instance date is required');
    showInfo('Example: tn recurring-complete "recurring-task-123" "2025-08-13"');
    showInfo('Format: YYYY-MM-DD');
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
    // Get task info first to show what we're completing
    const taskSpinner = ora('Fetching recurring task details...').start();
    const task = await api.getTask(taskId);
    taskSpinner.succeed('Recurring task found');

    console.log('\n' + chalk.bold('📅 Recurring Task Instance:'));
    console.log('─'.repeat(40));
    console.log(`${chalk.cyan('Task:')} ${task.title}`);
    console.log(`${chalk.cyan('Instance Date:')} ${instanceDate}`);

    // Complete the recurring instance
    const completeSpinner = ora('Completing recurring task instance...').start();
    const result = await api.completeRecurringInstance(taskId, instanceDate);
    completeSpinner.succeed('Recurring task instance completed');

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log('\n' + chalk.bold('✅ Recurring Task Instance Completed'));
    console.log('─'.repeat(45));
    console.log(`${chalk.cyan('Task:')} ${result.title}`);
    console.log(`${chalk.cyan('Completed Date:')} ${instanceDate}`);
    console.log(`${chalk.cyan('Status:')} ${result.status}`);
    
    if (result.nextInstance) {
      console.log(`${chalk.cyan('Next Instance:')} ${result.nextInstance}`);
    }

    showSuccess(`Recurring task instance for ${instanceDate} has been completed`);
    
  } catch (error) {
    showError(`Failed to complete recurring task instance: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { handler };