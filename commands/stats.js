const TaskNotesAPI = require('../lib/api');
const { showError, showSuccess, showInfo } = require('../lib/utils');
const ora = require('ora');
const chalk = require('chalk');

async function handler(options = {}) {
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
    const statsSpinner = ora('Fetching task statistics...').start();
    
    const stats = await api.getStats();
    statsSpinner.succeed('Task statistics retrieved');
    
    if (options.json) {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }

    // Display formatted stats
    console.log('\n' + chalk.bold('📊 Task Statistics'));
    console.log('─'.repeat(40));
    
    // Main stats
    console.log(`${chalk.cyan('Total tasks:')} ${stats.total}`);
    console.log(`${chalk.green('Completed:')} ${stats.completed}`);
    console.log(`${chalk.yellow('Active:')} ${stats.active}`);
    console.log(`${chalk.red('Overdue:')} ${stats.overdue}`);
    console.log(`${chalk.gray('Archived:')} ${stats.archived}`);
    
    if (stats.withTimeTracking) {
      console.log(`${chalk.blue('With time tracking:')} ${stats.withTimeTracking}`);
    }

    // Calculate completion rate
    const totalNonArchived = stats.total - stats.archived;
    if (totalNonArchived > 0) {
      const completionRate = Math.round((stats.completed / totalNonArchived) * 100);
      console.log(`${chalk.magenta('Completion rate:')} ${completionRate}%`);
    }

    // Visual progress bar for completion
    if (totalNonArchived > 0) {
      const completionRatio = stats.completed / totalNonArchived;
      const barLength = 20;
      const filledLength = Math.round(barLength * completionRatio);
      const progressBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
      console.log(`${chalk.bold('Progress:')} [${chalk.green(progressBar)}] ${Math.round(completionRatio * 100)}%`);
    }

    // Task distribution breakdown
    if (totalNonArchived > 0) {
      console.log('\n' + chalk.bold('Task Distribution:'));
      
      const activePercentage = Math.round((stats.active / totalNonArchived) * 100);
      const completedPercentage = Math.round((stats.completed / totalNonArchived) * 100);
      const overduePercentage = Math.round((stats.overdue / totalNonArchived) * 100);
      
      console.log(`${chalk.yellow('● Active:')} ${activePercentage}% (${stats.active} tasks)`);
      console.log(`${chalk.green('● Completed:')} ${completedPercentage}% (${stats.completed} tasks)`);
      console.log(`${chalk.red('● Overdue:')} ${overduePercentage}% (${stats.overdue} tasks)`);
      
      if (stats.archived > 0) {
        console.log(`${chalk.gray('● Archived:')} ${stats.archived} tasks (not included in percentages)`);
      }
    }

    // Productivity insights
    if (stats.overdue > 0) {
      console.log('\n' + chalk.bold('⚠️  Insights:'));
      if (stats.overdue > stats.active * 0.2) {
        console.log(chalk.yellow(`• You have ${stats.overdue} overdue tasks - consider reviewing priorities`));
      }
      if (stats.overdue > 10) {
        console.log(chalk.yellow('• High number of overdue tasks - try breaking them into smaller tasks'));
      }
    } else if (stats.active === 0 && stats.completed > 0) {
      console.log('\n' + chalk.bold('🎉 Great job!'));
      console.log(chalk.green('• All tasks are completed - time to create new ones!'));
    }

    // Time tracking insights
    if (stats.withTimeTracking) {
      const timeTrackingPercentage = Math.round((stats.withTimeTracking / stats.total) * 100);
      console.log('\n' + chalk.bold('⏱️  Time Tracking:'));
      console.log(`• ${timeTrackingPercentage}% of tasks have time tracking data`);
      
      if (timeTrackingPercentage < 50) {
        console.log(chalk.blue('• Consider using time tracking for better productivity insights'));
      }
    }

  } catch (error) {
    showError(`Failed to fetch statistics: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { handler };