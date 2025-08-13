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
        await startPomodoro(api, options);
        break;
      case 'stop':
        await stopPomodoro(api, options);
        break;
      case 'pause':
        await pausePomodoro(api, options);
        break;
      case 'resume':
        await resumePomodoro(api, options);
        break;
      case 'status':
        await showPomodoroStatus(api, options);
        break;
      case 'stats':
        await showPomodoroStats(api, options);
        break;
      case 'sessions':
        await showPomodoroSessions(api, options);
        break;
      default:
        showError('Invalid pomodoro action. Use: start, stop, pause, resume, status, stats, or sessions');
        process.exit(1);
    }
  } catch (error) {
    showError(`Pomodoro operation failed: ${error.message}`);
    process.exit(1);
  }
}

async function startPomodoro(api, options) {
  const spinner = ora('Starting pomodoro...').start();
  
  try {
    const params = {};
    if (options.task) {
      params.taskId = options.task;
    }
    if (options.duration) {
      params.duration = parseInt(options.duration);
    }
    
    const result = await api.startPomodoro(params);
    spinner.succeed('Pomodoro started');
    
    const duration = result.duration ? Math.round(result.duration / 60000) : 25; // Convert from milliseconds to minutes
    showSuccess(`Started ${duration}-minute pomodoro session`);
    
    if (result.task) {
      showInfo(`Task: ${result.task.title}`);
    }
    
    const sessionType = result.currentSession?.type || result.type || 'work';
    if (sessionType === 'work') {
      console.log(chalk.green('🍅 Work session started'));
    } else {
      console.log(chalk.blue('☕ Break session started'));
    }
    
  } catch (error) {
    spinner.fail('Failed to start pomodoro');
    throw error;
  }
}

async function stopPomodoro(api, options) {
  const spinner = ora('Stopping pomodoro...').start();
  
  try {
    const result = await api.stopPomodoro();
    spinner.succeed('Pomodoro stopped');
    
    if (result.session) {
      const duration = Math.round(result.session.duration / 60);
      showSuccess(`Pomodoro stopped. Duration: ${duration} minutes`);
      
      if (result.completed) {
        console.log(chalk.green('🎉 Session completed!'));
      } else {
        console.log(chalk.yellow('⏸️ Session interrupted'));
      }
    } else {
      showInfo('No active pomodoro to stop');
    }
  } catch (error) {
    spinner.fail('Failed to stop pomodoro');
    throw error;
  }
}

async function pausePomodoro(api, options) {
  const spinner = ora('Pausing pomodoro...').start();
  
  try {
    const result = await api.pausePomodoro();
    spinner.succeed('Pomodoro paused');
    showSuccess('Pomodoro session paused');
  } catch (error) {
    spinner.fail('Failed to pause pomodoro');
    throw error;
  }
}

async function resumePomodoro(api, options) {
  const spinner = ora('Resuming pomodoro...').start();
  
  try {
    const result = await api.resumePomodoro();
    spinner.succeed('Pomodoro resumed');
    showSuccess('Pomodoro session resumed');
  } catch (error) {
    spinner.fail('Failed to resume pomodoro');
    throw error;
  }
}

async function showPomodoroStatus(api, options) {
  const spinner = ora('Getting pomodoro status...').start();
  
  try {
    const status = await api.getPomodoroStatus();
    spinner.succeed('Pomodoro status retrieved');
    
    if (status.isRunning) {
      const remaining = status.timeRemaining ? Math.round(status.timeRemaining / 60) : 0; // Convert from seconds to minutes
      const total = status.currentSession?.plannedDuration || 25; // Already in minutes
      const elapsed = total - remaining;
      
      console.log('\n' + chalk.green('🍅 Pomodoro is running'));
      
      const sessionType = status.currentSession?.type || 'work';
      if (sessionType === 'work') {
        console.log(chalk.green('Type: Work session'));
      } else {
        console.log(chalk.blue('Type: Break session'));
      }
      
      console.log(`Progress: ${chalk.cyan(elapsed)}/${chalk.cyan(total)} minutes`);
      console.log(`Remaining: ${chalk.yellow(remaining)} minutes`);
      
      if (status.task) {
        console.log(`Task: ${chalk.bold(status.task.title)}`);
      }
      
      if (status.isPaused) {
        console.log(chalk.yellow('⏸️ Session is paused'));
      }
      
      // Progress bar
      const progress = total > 0 ? elapsed / total : 0;
      const barLength = 20;
      const filledLength = Math.round(barLength * progress);
      const progressBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
      console.log(`Progress: [${chalk.cyan(progressBar)}] ${Math.round(progress * 100)}%`);
      
    } else {
      console.log('\n' + chalk.gray('🍅 No pomodoro running'));
    }
    
    // Show additional enhanced status information
    console.log('\n' + chalk.bold('📊 Today\'s Progress:'));
    console.log('─'.repeat(30));
    
    if (status.totalPomodoros !== undefined) {
      console.log(`${chalk.cyan('Pomodoros completed:')} ${status.totalPomodoros}`);
    }
    
    if (status.currentStreak !== undefined) {
      console.log(`${chalk.cyan('Current streak:')} ${status.currentStreak}`);
    }
    
    if (status.totalMinutesToday !== undefined) {
      console.log(`${chalk.cyan('Focus time today:')} ${status.totalMinutesToday} minutes`);
    }
  } catch (error) {
    spinner.fail('Failed to get pomodoro status');
    throw error;
  }
}

async function showPomodoroStats(api, options) {
  const spinner = ora('Fetching pomodoro stats...').start();
  
  try {
    const filters = {};
    if (options.date) {
      filters.date = options.date;
    }
    // Note: API currently only supports date filtering, not week/month
    // Week and month options will show today's stats with a note
    
    const stats = await api.getPomodoroStats(filters);
    spinner.succeed('Pomodoro stats retrieved');
    
    console.log('\n' + chalk.bold('🍅 Pomodoro Statistics'));
    console.log('─'.repeat(40));
    
    if (options.date) {
      console.log(`Date: ${options.date}`);
    } else if (options.week) {
      console.log('Period: Today (API does not support weekly stats yet)');
    } else if (options.month) {
      console.log('Period: Today (API does not support monthly stats yet)');
    } else {
      console.log('Period: Today');
    }
    
    console.log(`${chalk.green('Pomodoros completed:')} ${stats.pomodorosCompleted || 0}`);
    console.log(`${chalk.yellow('Current streak:')} ${stats.currentStreak || 0}`);
    console.log(`${chalk.cyan('Total focus time:')} ${stats.totalMinutes || 0} minutes`);
    
    if (stats.averageSessionLength) {
      console.log(`${chalk.gray('Average session:')} ${Math.round(stats.averageSessionLength)} minutes`);
    }
    
    if (stats.completionRate !== undefined) {
      console.log(`${chalk.magenta('Completion rate:')} ${Math.round(stats.completionRate * 100)}%`);
    }
    
  } catch (error) {
    spinner.fail('Failed to fetch pomodoro stats');
    throw error;
  }
}

async function showPomodoroSessions(api, options) {
  const spinner = ora('Fetching pomodoro sessions...').start();
  
  try {
    const filters = {};
    
    if (options.date) {
      filters.date = options.date;
    }
    if (options.limit) {
      filters.limit = options.limit;
    }

    const result = await api.getPomodoroSessions(filters);
    spinner.succeed('Pomodoro sessions retrieved');
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    
    console.log('\n' + chalk.bold('🍅 Pomodoro Sessions'));
    console.log('─'.repeat(50));
    
    if (options.date) {
      console.log(`Date: ${options.date}`);
      console.log('─'.repeat(30));
    }
    
    if (!result.sessions || result.sessions.length === 0) {
      console.log(chalk.dim('No pomodoro sessions found'));
      if (options.date) {
        console.log(chalk.dim(`No sessions found for ${options.date}`));
      } else {
        console.log(chalk.dim('Start a pomodoro session with: tn pomodoro start'));
      }
      return;
    }
    
    result.sessions.forEach((session, index) => {
      if (index > 0) console.log('');
      
      const startTime = new Date(session.startTime);
      const endTime = session.endTime ? new Date(session.endTime) : null;
      const duration = session.duration ? Math.round(session.duration / 60) : 0;
      
      console.log(`${chalk.cyan(`Session ${index + 1}:`)} ${startTime.toLocaleTimeString()}`);
      
      if (session.taskTitle) {
        console.log(`  ${chalk.yellow('Task:')} ${session.taskTitle}`);
      }
      
      console.log(`  ${chalk.green('Type:')} ${session.type || 'work'}`);
      console.log(`  ${chalk.blue('Duration:')} ${duration} minutes`);
      
      if (session.completed) {
        console.log(`  ${chalk.green('✓ Completed')}`);
      } else {
        console.log(`  ${chalk.red('✗ Interrupted')}`);
      }
      
      if (endTime) {
        console.log(`  ${chalk.dim('Ended:')} ${endTime.toLocaleTimeString()}`);
      }
    });
    
    console.log(`\n${chalk.bold('Total sessions:')} ${result.sessions.length}`);
    if (result.total && result.total !== result.sessions.length) {
      console.log(`${chalk.dim('Showing')} ${result.sessions.length} ${chalk.dim('of')} ${result.total}`);
    }
    
  } catch (error) {
    spinner.fail('Failed to fetch pomodoro sessions');
    throw error;
  }
}

module.exports = { handler };