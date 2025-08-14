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
    if (result.timeEstimate) {
      showInfo(`Estimated time: ${result.timeEstimate} minutes`);
    }
    if (result.timeEntries && result.timeEntries.length > 0) {
      const lastEntry = result.timeEntries[result.timeEntries.length - 1];
      if (lastEntry.startTime && !lastEntry.endTime) {
        showInfo(`Timer started at: ${new Date(lastEntry.startTime).toLocaleTimeString()}`);
        if (lastEntry.description) {
          showInfo(`Description: ${lastEntry.description}`);
        }
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
        if (lastEntry.description) {
          showInfo(`Description: ${lastEntry.description}`);
        }
      }
    }
    
    // Calculate total time from all entries
    const totalMinutes = result.timeEntries.reduce((total, entry) => {
      if (entry.endTime && entry.startTime) {
        return total + Math.round((new Date(entry.endTime) - new Date(entry.startTime)) / 60000);
      }
      return total;
    }, 0);
    
    showInfo(`Total time on task: ${totalMinutes} minutes (${result.timeEntries.length} sessions)`);
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
    
    if (status.activeSessions && status.activeSessions.length > 0) {
      console.log('\n' + chalk.green(`⏱️  ${status.totalActiveSessions} timer${status.totalActiveSessions === 1 ? '' : 's'} running`));
      console.log(`Total elapsed: ${chalk.cyan(status.totalElapsedMinutes)} minutes\n`);
      
      status.activeSessions.forEach((activeSession, index) => {
        if (index > 0) console.log('');
        console.log(`${chalk.bold('Task:')} ${activeSession.task.title}`);
        console.log(`${chalk.cyan('Elapsed:')} ${activeSession.elapsedMinutes} minutes`);
        console.log(`${chalk.gray('Started:')} ${new Date(activeSession.session.startTime).toLocaleTimeString()}`);
        if (activeSession.session.description) {
          console.log(`${chalk.gray('Description:')} ${activeSession.session.description}`);
        }
      });
    } else {
      console.log('\n' + chalk.gray('⏱️  No timers running'));
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
    if (options.period) {
      filters.period = options.period;
    } else {
      filters.period = 'today'; // Default to today
    }
    if (options.from) {
      filters.from = options.from;
    }
    if (options.to) {
      filters.to = options.to;
    }
    
    // If a specific task is requested, get that task's time data instead
    if (options.task) {
      const taskTimeData = await api.getTaskTimeData(options.task);
      spinner.succeed(`Found ${taskTimeData.timeEntries.length} time entries for task`);
      
      if (taskTimeData.timeEntries.length === 0) {
        showInfo('No time entries found for this task');
        return;
      }

      console.log('\n' + chalk.bold(`Time Log for: ${taskTimeData.task.title}`));
      console.log('─'.repeat(60));
      console.log(`${chalk.cyan('Total time:')} ${taskTimeData.summary.totalMinutes} minutes (${taskTimeData.summary.totalHours} hours)`);
      console.log(`${chalk.gray('Sessions:')} ${taskTimeData.summary.totalSessions} (${taskTimeData.summary.completedSessions} completed, ${taskTimeData.summary.activeSessions} active)`);
      
      if (taskTimeData.activeSession) {
        console.log(`${chalk.green('Active session:')} ${taskTimeData.activeSession.elapsedMinutes} minutes (started ${new Date(taskTimeData.activeSession.startTime).toLocaleTimeString()})`);
      }
      
      console.log('\n' + chalk.bold('Time Entries:'));
      taskTimeData.timeEntries.forEach((entry, index) => {
        if (index > 0) console.log('');
        
        const startTime = new Date(entry.startTime).toLocaleString();
        const endTime = entry.endTime ? new Date(entry.endTime).toLocaleString() : 'Running';
        const status = entry.isActive ? chalk.green('Running') : chalk.gray('Completed');
        
        console.log(`${chalk.cyan('Duration:')} ${entry.duration} minutes`);
        console.log(`${chalk.gray('Started:')} ${startTime}`);
        console.log(`${chalk.gray('Ended:')} ${endTime}`);
        console.log(`${chalk.gray('Status:')} ${status}`);
        if (entry.description) {
          console.log(`${chalk.gray('Description:')} ${entry.description}`);
        }
      });
      
      return;
    }
    
    // Get time summary for the specified period
    const summary = await api.getTimeLog(filters);
    spinner.succeed(`Time summary for ${summary.period}`);
    
    console.log('\n' + chalk.bold(`Time Summary - ${summary.period.charAt(0).toUpperCase() + summary.period.slice(1)}`));
    console.log('─'.repeat(60));
    console.log(`${chalk.cyan('Total time:')} ${summary.summary.totalMinutes} minutes (${summary.summary.totalHours} hours)`);
    console.log(`${chalk.gray('Tasks with time:')} ${summary.summary.tasksWithTime}`);
    console.log(`${chalk.gray('Active tasks:')} ${summary.summary.activeTasks}`);
    console.log(`${chalk.gray('Completed tasks:')} ${summary.summary.completedTasks}`);
    
    if (summary.topTasks.length > 0) {
      console.log('\n' + chalk.bold('Top Tasks:'));
      summary.topTasks.slice(0, 5).forEach((task, index) => {
        console.log(`${index + 1}. ${chalk.blue(task.title)} - ${chalk.cyan(task.minutes)} minutes`);
      });
    }
    
    if (summary.topProjects.length > 0) {
      console.log('\n' + chalk.bold('Top Projects:'));
      summary.topProjects.slice(0, 5).forEach((project, index) => {
        console.log(`${index + 1}. ${chalk.blue(project.project)} - ${chalk.cyan(project.minutes)} minutes`);
      });
    }
    
    if (summary.topTags.length > 0) {
      console.log('\n' + chalk.bold('Top Tags:'));
      summary.topTags.slice(0, 5).forEach((tag, index) => {
        console.log(`${index + 1}. ${chalk.blue(tag.tag)} - ${chalk.cyan(tag.minutes)} minutes`);
      });
    }
    
  } catch (error) {
    spinner.fail('Failed to fetch time log');
    throw error;
  }
}

module.exports = { handler };