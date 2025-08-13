const TaskNotesAPI = require('../lib/api');
const { showError, showSuccess, showInfo, formatTask } = require('../lib/utils');
const ora = require('ora');
const chalk = require('chalk');

async function handler(taskId, options = {}) {
  if (!taskId) {
    showError('Task ID or path is required');
    showInfo('Usage: tn update <task-id> [options]');
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
    // Build update object from options
    const updates = {};
    
    if (options.status) {
      updates.status = options.status;
    }
    
    if (options.priority) {
      updates.priority = options.priority;
    }
    
    if (options.due) {
      updates.due = options.due;
    }
    
    if (options.scheduled) {
      updates.scheduled = options.scheduled;
    }
    
    if (options.title) {
      updates.title = options.title;
    }
    
    if (options.estimate) {
      updates.estimate = parseInt(options.estimate);
    }
    
    if (options.addTags) {
      updates.addTags = options.addTags.split(',').map(tag => tag.trim());
    }
    
    if (options.removeTags) {
      updates.removeTags = options.removeTags.split(',').map(tag => tag.trim());
    }
    
    if (options.addContexts) {
      updates.addContexts = options.addContexts.split(',').map(ctx => ctx.trim());
    }
    
    if (options.removeContexts) {
      updates.removeContexts = options.removeContexts.split(',').map(ctx => ctx.trim());
    }
    
    if (options.addProjects) {
      updates.addProjects = options.addProjects.split(',').map(proj => proj.trim());
    }
    
    if (options.removeProjects) {
      updates.removeProjects = options.removeProjects.split(',').map(proj => proj.trim());
    }

    if (Object.keys(updates).length === 0) {
      showError('No updates specified');
      showInfo('Use --status, --priority, --due, --scheduled, --title, --estimate, --add-tags, --remove-tags, etc.');
      process.exit(1);
    }

    const updateSpinner = ora('Updating task...').start();
    
    const updatedTask = await api.updateTask(taskId, updates);
    updateSpinner.succeed('Task updated successfully');
    
    console.log('\n' + chalk.bold('Updated Task:'));
    console.log('─'.repeat(50));
    console.log(formatTask(updatedTask, { showId: true }));
    
    showSuccess('Task properties updated successfully');
    
  } catch (error) {
    showError(`Failed to update task: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { handler };