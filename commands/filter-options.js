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
    const filterSpinner = ora('Fetching filter options...').start();
    const filterOptions = await api.getFilterOptions();
    filterSpinner.succeed('Filter options retrieved');

    if (options.json) {
      console.log(JSON.stringify(filterOptions, null, 2));
      return;
    }

    console.log('\n' + chalk.bold('🔍 Available Filter Options'));
    console.log('═'.repeat(50));

    if (filterOptions.statuses && filterOptions.statuses.length > 0) {
      console.log('\n' + chalk.bold('📋 Statuses:'));
      filterOptions.statuses.forEach(status => {
        const statusValue = typeof status === 'object' ? status.value : status;
        const statusLabel = typeof status === 'object' ? status.label : status;
        console.log(`  • ${chalk.cyan(statusValue)} (${statusLabel})`);
      });
    }

    if (filterOptions.priorities && filterOptions.priorities.length > 0) {
      console.log('\n' + chalk.bold('⚡ Priorities:'));
      filterOptions.priorities.forEach(priority => {
        const priorityValue = typeof priority === 'object' ? priority.value : priority;
        const priorityLabel = typeof priority === 'object' ? priority.label : priority;
        console.log(`  • ${chalk.yellow(priorityValue)} (${priorityLabel})`);
      });
    }

    if (filterOptions.tags && filterOptions.tags.length > 0) {
      console.log('\n' + chalk.bold('🏷️  Tags:'));
      const tags = filterOptions.tags.slice(0, 20); // Show first 20 tags
      tags.forEach(tag => {
        console.log(`  • ${chalk.green('#' + tag)}`);
      });
      if (filterOptions.tags.length > 20) {
        console.log(`  ${chalk.dim(`... and ${filterOptions.tags.length - 20} more`)}`);
      }
    }

    if (filterOptions.contexts && filterOptions.contexts.length > 0) {
      console.log('\n' + chalk.bold('📍 Contexts:'));
      const contexts = filterOptions.contexts.slice(0, 20); // Show first 20 contexts
      contexts.forEach(context => {
        console.log(`  • ${chalk.blue('@' + context)}`);
      });
      if (filterOptions.contexts.length > 20) {
        console.log(`  ${chalk.dim(`... and ${filterOptions.contexts.length - 20} more`)}`);
      }
    }

    if (filterOptions.projects && filterOptions.projects.length > 0) {
      console.log('\n' + chalk.bold('📁 Projects:'));
      const projects = filterOptions.projects.slice(0, 20); // Show first 20 projects
      projects.forEach(project => {
        console.log(`  • ${chalk.magenta('+' + project)}`);
      });
      if (filterOptions.projects.length > 20) {
        console.log(`  ${chalk.dim(`... and ${filterOptions.projects.length - 20} more`)}`);
      }
    }

    console.log('\n' + chalk.bold('💡 Usage Examples:'));
    console.log('─'.repeat(30));
    console.log(`${chalk.dim('Filter by status:')} tn list --filter "status:in-progress"`);
    console.log(`${chalk.dim('Filter by priority:')} tn list --filter "priority:urgent"`);
    console.log(`${chalk.dim('Filter by tag:')} tn list --filter "tags:work"`);
    console.log(`${chalk.dim('Complex filter:')} tn list --filter "priority:urgent AND tags:work"`);
    console.log(`${chalk.dim('Get filter help:')} tn filter-help`);

  } catch (error) {
    showError(`Failed to fetch filter options: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { handler };