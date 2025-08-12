const TaskNotesAPI = require('../lib/api');
const { showError, showInfo, formatTask } = require('../lib/utils');
const ora = require('ora');

async function handler(options = {}) {
  const api = new TaskNotesAPI();
  const spinner = ora('Fetching tasks...').start();

  try {
    // Test connection
    const connected = await api.testConnection();
    if (!connected) {
      spinner.fail('Cannot connect to TaskNotes API');
      showError('Make sure TaskNotes is running with API enabled');
      process.exit(1);
    }

    // Build filters based on options
    const filters = {};
    
    if (options.today) {
      const today = new Date().toISOString().split('T')[0];
      filters.scheduled_after = today;
      filters.scheduled_before = today + 'T23:59:59';
    }
    
    if (options.overdue) {
      const now = new Date().toISOString();
      filters.due_before = now;
      filters.completed = 'false';
    }
    
    if (options.completed) {
      filters.completed = 'true';
    } else if (!options.completed) {
      filters.completed = 'false';
    }
    
    if (options.limit) {
      filters.limit = parseInt(options.limit);
    }

    // Fetch tasks
    const result = await api.listTasks(filters);
    const tasks = result.tasks || [];
    
    spinner.succeed(`Found ${tasks.length} tasks`);

    if (tasks.length === 0) {
      showInfo('No tasks found matching your criteria');
      return;
    }

    // Display header
    let header = 'Tasks';
    if (options.today) header = "Today's Tasks";
    else if (options.overdue) header = 'Overdue Tasks';
    else if (options.completed) header = 'Completed Tasks';
    
    console.log(`\n${header}:`);
    console.log('─'.repeat(50));

    // Display tasks
    tasks.forEach((task, index) => {
      if (index > 0) console.log(''); // Add spacing between tasks
      console.log(formatTask(task, { showId: true }));
    });

    // Show summary
    if (result.total && result.total > tasks.length) {
      console.log(`\nShowing ${tasks.length} of ${result.total} tasks`);
      showInfo(`Use --limit to see more results`);
    }

  } catch (error) {
    spinner.fail('Failed to fetch tasks');
    showError(error.message);
    process.exit(1);
  }
}

module.exports = { handler };