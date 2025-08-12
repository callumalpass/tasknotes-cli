const TaskNotesAPI = require('../lib/api');
const { showError, showInfo, formatTask } = require('../lib/utils');
const FilterParser = require('../lib/filter-parser');
const ora = require('ora');

async function handler(options = {}) {
  const api = new TaskNotesAPI();
  
  // Check for conflicting options
  if (options.filter && (options.today || options.overdue || options.completed)) {
    showError('Cannot use --filter with --today, --overdue, or --completed options');
    showInfo('Use --filter for advanced filtering, or basic options for simple filters');
    process.exit(1);
  }
  
  const spinner = ora('Fetching tasks...').start();

  try {
    // Test connection
    const connected = await api.testConnection();
    if (!connected) {
      spinner.fail('Cannot connect to TaskNotes API');
      showError('Make sure TaskNotes is running with API enabled');
      process.exit(1);
    }

    let result;
    let tasks;
    let header = 'Tasks';
    
    if (options.filter) {
      // Use advanced filtering
      try {
        const parser = new FilterParser();
        const filterQuery = parser.parse(options.filter);
        
        // Add limit to filter query if specified
        if (options.limit) {
          // Note: Advanced filtering doesn't support limit directly in the query
          // We'll apply it after getting results
        }
        
        result = await api.queryTasks(filterQuery);
        tasks = result.tasks || [];
        
        // Apply limit if specified (since advanced API doesn't support pagination yet)
        if (options.limit) {
          const limit = parseInt(options.limit);
          if (tasks.length > limit) {
            result.filtered = tasks.length; // Store original count
            tasks = tasks.slice(0, limit);
          }
        }
        
        header = `Filtered Tasks`;
      } catch (error) {
        spinner.fail('Filter parsing failed');
        showError(error.message);
        showInfo('Use "tn list --help" to see filter syntax examples');
        process.exit(1);
      }
    } else {
      // Use basic filtering
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
    } else {
      // By default, show only non-completed tasks unless --completed is specified
      filters.completed = 'false';
    }
    
      if (options.limit) {
        filters.limit = parseInt(options.limit);
      }

      // Fetch tasks
      result = await api.listTasks(filters);
      tasks = result.tasks || [];
      
      // Set header based on basic filter options
      if (options.today) header = "Today's Tasks";
      else if (options.overdue) header = 'Overdue Tasks';
      else if (options.completed) header = 'Completed Tasks';
    }
    
    spinner.succeed(`Found ${tasks.length} tasks`);

    if (options.json) {
      // Output JSON format
      const jsonOutput = {
        success: true,
        data: {
          tasks: tasks,
          total: result.total || 0,
          filtered: result.filtered || tasks.length,
          count: tasks.length,
          vault: result.vault || null
        },
        meta: {
          filter: options.filter || null,
          today: options.today || false,
          overdue: options.overdue || false,
          completed: options.completed || false,
          limit: options.limit ? parseInt(options.limit) : null
        }
      };
      
      console.log(JSON.stringify(jsonOutput, null, 2));
      return;
    }

    if (tasks.length === 0) {
      showInfo('No tasks found matching your criteria');
      return;
    }

    // Display header is now set above
    
    console.log(`\n${header}:`);
    console.log('─'.repeat(50));

    // Display tasks
    tasks.forEach((task, index) => {
      if (index > 0) console.log(''); // Add spacing between tasks
      console.log(formatTask(task, { showId: true }));
    });

    // Show summary
    const relevantTotal = result.filtered || result.total; // Use filtered count if available, otherwise total
    if (relevantTotal && relevantTotal > tasks.length) {
      let taskType = 'tasks';
      if (options.completed) taskType = 'completed tasks';
      else if (options.overdue) taskType = 'overdue tasks';
      else if (options.today) taskType = "today's tasks";
      
      console.log(`\nShowing ${tasks.length} of ${relevantTotal} ${taskType}`);
      showInfo(`Use --limit to see more results`);
    }

  } catch (error) {
    spinner.fail('Failed to fetch tasks');
    showError(error.message);
    process.exit(1);
  }
}

module.exports = { handler };