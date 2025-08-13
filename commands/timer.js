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
      case 'start':
        await startTimer(api, options);
        break;
      case 'stop':
        await stopTimer(api, options);
        break;
      case 'status':
        await showTimerStatus(api, options);
        break;
      case 'log':
        await showTimeLog(api, options);
        break;
      default:
        showError('Invalid timer action. Use: start, stop, status, or log');
        process.exit(1);
    }
  } catch (error) {
    showError(`Timer operation failed: ${error.message}`);
    process.exit(1);
  }
}

async function startTimer(api, options) {
  if (!options.task) {
    showError('Task ID or path is required. Use --task <task-id>');
    process.exit(1);
  }

  const spinner = ora('Starting timer...').start();
  
  try {
    const result = await api.startTimer(options.task);
    spinner.succeed('Timer started');
    showSuccess(`Started timer for: ${result.title}`);
    if (result.estimate) {
      showInfo(`Estimated time: ${result.estimate} minutes`);
    }
    if (result.timeEntries && result.timeEntries.length > 0) {
      const currentEntry = result.timeEntries[result.timeEntries.length - 1];
      if (currentEntry.startTime && !currentEntry.endTime) {
        showInfo(`Timer started at: ${new Date(currentEntry.startTime).toLocaleTimeString()}`);
      }
    }
  } catch (error) {
    spinner.fail('Failed to start timer');
    throw error;
  }
}

async function stopTimer(api, options) {
  if (!options.task) {
    showError('Task ID or path is required. Use --task <task-id>');
    process.exit(1);
  }

  const spinner = ora('Stopping timer...').start();
  
  try {
    const result = await api.stopTimer(options.task);
    spinner.succeed('Timer stopped');
    
    showSuccess(`Timer stopped for: ${result.title}`);
    if (result.timeEntries && result.timeEntries.length > 0) {
      const lastEntry = result.timeEntries[result.timeEntries.length - 1];
      if (lastEntry.endTime && lastEntry.startTime) {
        const duration = Math.round((new Date(lastEntry.endTime) - new Date(lastEntry.startTime)) / 60000);
        showInfo(`Session duration: ${duration} minutes`);
      }
    }
  } catch (error) {
    spinner.fail('Failed to stop timer');
    throw error;
  }
}

async function showTimerStatus(api, options) {
  const spinner = ora('Getting timer status...').start();
  
  try {
    const status = await api.getTimerStatus();
    spinner.succeed('Timer status retrieved');
    
    if (status.isRunning) {
      const elapsed = Math.round(status.elapsed / 60); // Convert to minutes
      console.log('\n' + chalk.green('⏱️  Timer is running'));
      console.log(`Task: ${chalk.bold(status.task.title)}`);
      console.log(`Elapsed: ${chalk.cyan(elapsed)} minutes`);
      if (status.task.estimate) {
        const remaining = status.task.estimate - elapsed;
        console.log(`Estimated remaining: ${remaining > 0 ? chalk.yellow(remaining) : chalk.red('Over estimate')} minutes`);
      }
    } else {
      console.log('\n' + chalk.gray('⏱️  No timer running'));
    }
  } catch (error) {
    spinner.fail('Failed to get timer status');
    throw error;
  }
}

async function showTimeLog(api, options) {
  const spinner = ora('Fetching time log...').start();
  
  try {
    const filters = {};
    if (options.task) {
      filters.task = options.task;
    }
    if (options.date) {
      filters.date = options.date;
    }
    if (options.limit) {
      filters.limit = parseInt(options.limit);
    }
    
    const log = await api.getTimeLog(filters);
    spinner.succeed(`Found ${log.sessions.length} time sessions`);
    
    if (log.sessions.length === 0) {
      showInfo('No time sessions found');
      return;
    }

    console.log('\n' + chalk.bold('Time Log:'));
    console.log('─'.repeat(60));
    
    let totalTime = 0;
    log.sessions.forEach((session, index) => {
      if (index > 0) console.log('');
      
      const duration = Math.round(session.duration / 60); // Convert to minutes
      const startTime = new Date(session.startTime).toLocaleString();
      
      console.log(`${chalk.cyan('Duration:')} ${duration} minutes`);
      console.log(`${chalk.gray('Started:')} ${startTime}`);
      console.log(`${chalk.blue('Task:')} ${session.task.title}`);
      
      if (session.task.path) {
        console.log(`${chalk.gray('File:')} ${session.task.path}`);
      }
      
      totalTime += duration;
    });
    
    if (log.sessions.length > 1) {
      console.log('\n' + chalk.bold(`Total time: ${totalTime} minutes`));
    }
    
  } catch (error) {
    spinner.fail('Failed to fetch time log');
    throw error;
  }
}

module.exports = { handler };