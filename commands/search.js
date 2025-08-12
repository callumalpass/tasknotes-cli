const TaskNotesAPI = require('../lib/api');
const { showError, showInfo, formatTask, colors } = require('../lib/utils');
const ora = require('ora');

async function handler(query) {
  if (!query || !query.trim()) {
    showError('Please provide a search query');
    process.exit(1);
  }

  const api = new TaskNotesAPI();
  const spinner = ora(`Searching for "${query}"...`).start();

  try {
    // Test connection
    const connected = await api.testConnection();
    if (!connected) {
      spinner.fail('Cannot connect to TaskNotes API');
      showError('Make sure TaskNotes is running with API enabled');
      process.exit(1);
    }

    // Get all tasks and filter client-side for now
    // TODO: Update when API supports server-side search
    const result = await api.listTasks({ limit: 1000, archived: 'false' });
    const allTasks = result.tasks || [];
    
    // Simple text search across task fields
    const query_lower = query.toLowerCase();
    const matchingTasks = allTasks.filter(task => {
      return (
        task.title?.toLowerCase().includes(query_lower) ||
        task.details?.toLowerCase().includes(query_lower) ||
        task.tags?.some(tag => tag.toLowerCase().includes(query_lower)) ||
        task.contexts?.some(ctx => ctx.toLowerCase().includes(query_lower)) ||
        task.projects?.some(proj => proj.toLowerCase().includes(query_lower)) ||
        task.id?.toLowerCase().includes(query_lower)
      );
    });

    spinner.succeed(`Found ${matchingTasks.length} tasks matching "${query}"`);

    if (matchingTasks.length === 0) {
      showInfo('No tasks found matching your search criteria');
      showInfo('Try different keywords or check spelling');
      return;
    }

    // Sort by relevance (title matches first, then others)
    matchingTasks.sort((a, b) => {
      const aTitle = a.title?.toLowerCase().includes(query_lower) ? 1 : 0;
      const bTitle = b.title?.toLowerCase().includes(query_lower) ? 1 : 0;
      return bTitle - aTitle;
    });

    console.log(`\nSearch Results for "${colors.highlight(query)}":`);
    console.log('─'.repeat(50));

    // Display matching tasks
    matchingTasks.forEach((task, index) => {
      if (index > 0) console.log(''); // Add spacing between tasks
      console.log(formatTask(task, { showId: true }));
    });

    // Show summary
    if (matchingTasks.length >= 20) {
      showInfo('Showing first 20 results. Refine your search for more specific results.');
    }

  } catch (error) {
    spinner.fail('Search failed');
    showError(error.message);
    process.exit(1);
  }
}

module.exports = { handler };