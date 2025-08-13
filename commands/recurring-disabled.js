const TaskNotesAPI = require('../lib/api');
const { showError, showSuccess, showInfo, formatTask } = require('../lib/utils');
const ora = require('ora');
const chalk = require('chalk');

async function handler(action, options = {}) {
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
    switch (action) {
      case 'create':
        await createRecurringTask(api, options);
        break;
      case 'list':
        await listRecurringTasks(api, options);
        break;
      case 'show':
        if (!options.id) {
          showError('Recurring task ID is required');
          showInfo('Usage: tn recurring show --id <task-id>');
          process.exit(1);
        }
        await showRecurringTask(api, options.id, options);
        break;
      case 'update':
        if (!options.id) {
          showError('Recurring task ID is required');
          showInfo('Usage: tn recurring update --id <task-id> [options]');
          process.exit(1);
        }
        await updateRecurringTask(api, options.id, options);
        break;
      case 'disable':
        if (!options.id) {
          showError('Recurring task ID is required');
          showInfo('Usage: tn recurring disable --id <task-id>');
          process.exit(1);
        }
        await disableRecurringTask(api, options.id, options);
        break;
      case 'enable':
        if (!options.id) {
          showError('Recurring task ID is required');
          showInfo('Usage: tn recurring enable --id <task-id>');
          process.exit(1);
        }
        await enableRecurringTask(api, options.id, options);
        break;
      case 'instances':
        if (!options.id) {
          showError('Recurring task ID is required');
          showInfo('Usage: tn recurring instances --id <task-id>');
          process.exit(1);
        }
        await showRecurringInstances(api, options.id, options);
        break;
      default:
        showError('Invalid recurring action. Use: create, list, show, update, disable, enable, or instances');
        process.exit(1);
    }
  } catch (error) {
    showError(`Recurring task operation failed: ${error.message}`);
    process.exit(1);
  }
}

async function createRecurringTask(api, options) {
  if (!options.title) {
    showError('Task title is required');
    showInfo('Usage: tn recurring create --title "Task title" --pattern "daily" [options]');
    process.exit(1);
  }
  
  if (!options.pattern) {
    showError('Recurrence pattern is required');
    showInfo('Examples: --pattern "daily", --pattern "weekly", --pattern "every monday"');
    process.exit(1);
  }

  const spinner = ora('Creating recurring task...').start();
  
  try {
    const taskData = {
      title: options.title,
      recurrencePattern: options.pattern,
      description: options.description || '',
      priority: options.priority || 'medium',
      estimate: options.estimate ? parseInt(options.estimate) : null,
      contexts: options.contexts ? options.contexts.split(',').map(c => c.trim()) : [],
      tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
      projects: options.projects ? options.projects.split(',').map(p => p.trim()) : []
    };
    
    if (options.startDate) {
      taskData.startDate = options.startDate;
    }
    
    if (options.endDate) {
      taskData.endDate = options.endDate;
    }
    
    if (options.time) {
      taskData.scheduledTime = options.time;
    }
    
    const result = await api.createRecurringTask(taskData);
    spinner.succeed('Recurring task created successfully');
    
    showSuccess(`Created recurring task: ${result.task.title}`);
    showInfo(`Pattern: ${result.task.recurrencePattern}`);
    showInfo(`Next instance: ${result.nextInstance || 'Not scheduled'}`);
    
    if (result.task.path) {
      showInfo(`Template file: ${result.task.path}`);
    }
    
  } catch (error) {
    spinner.fail('Failed to create recurring task');
    throw error;
  }
}

async function listRecurringTasks(api, options) {
  const spinner = ora('Fetching recurring tasks...').start();
  
  try {
    const filters = {};
    if (options.active !== undefined) {
      filters.active = options.active;
    }
    
    const result = await api.listRecurringTasks(filters);
    spinner.succeed(`Found ${result.tasks.length} recurring tasks`);
    
    if (result.tasks.length === 0) {
      showInfo('No recurring tasks found');
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log('\n' + chalk.bold('Recurring Tasks:'));
    console.log('─'.repeat(60));
    
    result.tasks.forEach((task, index) => {
      if (index > 0) console.log('');
      
      const statusIcon = task.isActive ? '🔄' : '⏸️';
      const statusColor = task.isActive ? chalk.green : chalk.gray;
      
      console.log(`${statusIcon} ${chalk.bold(task.title)}`);
      console.log(`   ${chalk.cyan('Pattern:')} ${task.recurrencePattern}`);
      console.log(`   ${chalk.gray('Status:')} ${statusColor(task.isActive ? 'Active' : 'Disabled')}`);
      
      if (task.nextInstance) {
        console.log(`   ${chalk.yellow('Next:')} ${task.nextInstance}`);
      }
      
      if (task.lastInstance) {
        console.log(`   ${chalk.blue('Last:')} ${task.lastInstance}`);
      }
      
      console.log(`   ${chalk.magenta('Instances:')} ${task.totalInstances} total, ${task.completedInstances} completed`);
      
      if (task.path) {
        console.log(`   ${chalk.gray('File:')} ${task.path}`);
      }
    });
    
  } catch (error) {
    spinner.fail('Failed to fetch recurring tasks');
    throw error;
  }
}

async function showRecurringTask(api, taskId, options) {
  const spinner = ora('Fetching recurring task details...').start();
  
  try {
    const result = await api.getRecurringTask(taskId, { includeInstances: true });
    spinner.succeed('Recurring task details retrieved');
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const task = result.task;
    
    console.log('\n' + chalk.bold(`🔄 Recurring Task: ${task.title}`));
    console.log('─'.repeat(60));
    
    console.log(`${chalk.cyan('Pattern:')} ${task.recurrencePattern}`);
    console.log(`${chalk.gray('Status:')} ${task.isActive ? chalk.green('Active') : chalk.red('Disabled')}`);
    
    if (task.description) {
      console.log(`${chalk.gray('Description:')} ${task.description}`);
    }
    
    if (task.priority) {
      console.log(`${chalk.yellow('Priority:')} ${task.priority}`);
    }
    
    if (task.estimate) {
      console.log(`${chalk.blue('Estimate:')} ${task.estimate} minutes`);
    }
    
    if (task.contexts && task.contexts.length > 0) {
      console.log(`${chalk.green('Contexts:')} ${task.contexts.join(', ')}`);
    }
    
    if (task.tags && task.tags.length > 0) {
      console.log(`${chalk.magenta('Tags:')} ${task.tags.join(', ')}`);
    }
    
    if (task.projects && task.projects.length > 0) {
      console.log(`${chalk.cyan('Projects:')} ${task.projects.join(', ')}`);
    }
    
    // Timing info
    if (task.startDate) {
      console.log(`${chalk.gray('Start date:')} ${task.startDate}`);
    }
    
    if (task.endDate) {
      console.log(`${chalk.gray('End date:')} ${task.endDate}`);
    }
    
    if (task.scheduledTime) {
      console.log(`${chalk.gray('Scheduled time:')} ${task.scheduledTime}`);
    }
    
    // Instance stats
    console.log('\n' + chalk.bold('Instance Statistics:'));
    console.log(`${chalk.green('Total instances:')} ${task.totalInstances}`);
    console.log(`${chalk.blue('Completed:')} ${task.completedInstances}`);
    console.log(`${chalk.yellow('Pending:')} ${task.totalInstances - task.completedInstances}`);
    
    if (task.completionRate) {
      console.log(`${chalk.magenta('Completion rate:')} ${Math.round(task.completionRate * 100)}%`);
    }
    
    if (task.nextInstance) {
      console.log(`${chalk.cyan('Next instance:')} ${task.nextInstance}`);
    }
    
    if (task.lastInstance) {
      console.log(`${chalk.gray('Last instance:')} ${task.lastInstance}`);
    }
    
    // Recent instances
    if (result.instances && result.instances.length > 0) {
      const limit = options.limit ? parseInt(options.limit) : 5;
      const instancesToShow = result.instances.slice(0, limit);
      
      console.log('\n' + chalk.bold('Recent Instances:'));
      console.log('─'.repeat(50));
      
      instancesToShow.forEach((instance, index) => {
        if (index > 0) console.log('');
        console.log(formatTask(instance, { showId: true, compact: true }));
      });
      
      if (result.instances.length > limit) {
        console.log(`\n${chalk.gray(`... and ${result.instances.length - limit} more instances`)}`);
      }
    }
    
  } catch (error) {
    spinner.fail('Failed to fetch recurring task');
    throw error;
  }
}

async function updateRecurringTask(api, taskId, options) {
  const spinner = ora('Updating recurring task...').start();
  
  try {
    const updates = {};
    
    if (options.title) {
      updates.title = options.title;
    }
    
    if (options.pattern) {
      updates.recurrencePattern = options.pattern;
    }
    
    if (options.description !== undefined) {
      updates.description = options.description;
    }
    
    if (options.priority) {
      updates.priority = options.priority;
    }
    
    if (options.estimate) {
      updates.estimate = parseInt(options.estimate);
    }
    
    if (options.startDate) {
      updates.startDate = options.startDate;
    }
    
    if (options.endDate) {
      updates.endDate = options.endDate;
    }
    
    if (options.time) {
      updates.scheduledTime = options.time;
    }

    if (Object.keys(updates).length === 0) {
      showError('No updates specified');
      showInfo('Use --title, --pattern, --description, --priority, --estimate, etc.');
      process.exit(1);
    }

    const result = await api.updateRecurringTask(taskId, updates);
    spinner.succeed('Recurring task updated successfully');
    
    showSuccess(`Updated recurring task: ${result.task.title}`);
    
    if (result.changes && result.changes.length > 0) {
      console.log('\n' + chalk.bold('Changes made:'));
      result.changes.forEach(change => {
        console.log(`• ${change.field}: ${chalk.gray(change.from || 'none')} → ${chalk.green(change.to || 'none')}`);
      });
    }
    
    if (result.nextInstanceChanged) {
      showInfo(`Next instance updated: ${result.nextInstance}`);
    }
    
  } catch (error) {
    spinner.fail('Failed to update recurring task');
    throw error;
  }
}

async function disableRecurringTask(api, taskId, options) {
  const spinner = ora('Disabling recurring task...').start();
  
  try {
    const result = await api.updateRecurringTask(taskId, { isActive: false });
    spinner.succeed('Recurring task disabled');
    
    showSuccess(`Disabled recurring task: ${result.task.title}`);
    showInfo('No new instances will be created');
    
  } catch (error) {
    spinner.fail('Failed to disable recurring task');
    throw error;
  }
}

async function enableRecurringTask(api, taskId, options) {
  const spinner = ora('Enabling recurring task...').start();
  
  try {
    const result = await api.updateRecurringTask(taskId, { isActive: true });
    spinner.succeed('Recurring task enabled');
    
    showSuccess(`Enabled recurring task: ${result.task.title}`);
    if (result.nextInstance) {
      showInfo(`Next instance: ${result.nextInstance}`);
    }
    
  } catch (error) {
    spinner.fail('Failed to enable recurring task');
    throw error;
  }
}

async function showRecurringInstances(api, taskId, options) {
  const spinner = ora('Fetching recurring task instances...').start();
  
  try {
    const filters = {};
    if (options.status) {
      filters.status = options.status;
    }
    if (options.limit) {
      filters.limit = parseInt(options.limit);
    }
    if (options.from) {
      filters.from = options.from;
    }
    if (options.to) {
      filters.to = options.to;
    }
    
    const result = await api.getRecurringTaskInstances(taskId, filters);
    spinner.succeed(`Found ${result.instances.length} instances`);
    
    if (result.instances.length === 0) {
      showInfo('No instances found');
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log('\n' + chalk.bold(`Recurring Task Instances: ${result.task.title}`));
    console.log('─'.repeat(60));
    
    result.instances.forEach((instance, index) => {
      if (index > 0) console.log('');
      console.log(formatTask(instance, { showId: true }));
    });
    
    // Summary stats
    const completed = result.instances.filter(i => i.status === 'completed').length;
    const pending = result.instances.length - completed;
    
    console.log('\n' + chalk.bold('Instance Summary:'));
    console.log(`${chalk.green('Completed:')} ${completed}`);
    console.log(`${chalk.yellow('Pending:')} ${pending}`);
    console.log(`${chalk.cyan('Total:')} ${result.instances.length}`);
    
  } catch (error) {
    spinner.fail('Failed to fetch recurring task instances');
    throw error;
  }
}

module.exports = { handler };