const TaskNotesAPI = require('../lib/api');
const { showSuccess, showError, formatTask } = require('../lib/utils');
const ora = require('ora');

async function handler(taskId) {
  if (!taskId || !taskId.trim()) {
    showError('Please provide a task ID');
    console.log('Use "tn list --show-id" to see task IDs');
    process.exit(1);
  }

  const api = new TaskNotesAPI();
  const spinner = ora('Marking task as complete...').start();

  try {
    // Test connection
    const connected = await api.testConnection();
    if (!connected) {
      spinner.fail('Cannot connect to TaskNotes API');
      showError('Make sure TaskNotes is running with API enabled');
      process.exit(1);
    }

    // Get the task first to show what we're completing
    spinner.text = 'Finding task...';
    let task;
    try {
      task = await api.getTask(taskId);
    } catch (error) {
      spinner.fail('Task not found');
      showError(`Could not find task with ID: ${taskId}`);
      showError('Use "tn list" to see available tasks');
      process.exit(1);
    }

    // Check if already completed
    if (task.status === 'completed') {
      spinner.warn('Task is already completed');
      console.log('\nTask:');
      console.log(formatTask(task));
      return;
    }

    // Toggle the task status (should mark as complete)
    spinner.text = 'Updating task status...';
    const updatedTask = await api.toggleTaskStatus(taskId);
    
    if (updatedTask.status === 'completed') {
      spinner.succeed('Task marked as complete!');
    } else {
      spinner.succeed(`Task status changed to: ${updatedTask.status}`);
    }

    // Show the updated task
    console.log('\nUpdated task:');
    console.log(formatTask(updatedTask));

  } catch (error) {
    spinner.fail('Failed to complete task');
    showError(error.message);
    process.exit(1);
  }
}

module.exports = { handler };