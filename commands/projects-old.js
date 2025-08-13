const TaskNotesAPI = require('../lib/api');
const { showError, showSuccess, showInfo, formatTask } = require('../lib/utils');
const ora = require('ora');
const chalk = require('chalk');

async function handler(action, projectName, options = {}) {
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
      case 'list':
        await listProjects(api, options);
        break;
      case 'show':
        if (!projectName) {
          showError('Project name is required');
          showInfo('Usage: tn projects show <project-name>');
          process.exit(1);
        }
        await showProject(api, projectName, options);
        break;
      case 'create':
        if (!projectName) {
          showError('Project name is required');
          showInfo('Usage: tn projects create <project-name> [options]');
          process.exit(1);
        }
        await createProject(api, projectName, options);
        break;
      case 'stats':
        if (!projectName) {
          showError('Project name is required');
          showInfo('Usage: tn projects stats <project-name>');
          process.exit(1);
        }
        await showProjectStats(api, projectName, options);
        break;
      default:
        showError('Invalid projects action. Use: list, show, create, or stats');
        process.exit(1);
    }
  } catch (error) {
    showError(`Projects operation failed: ${error.message}`);
    process.exit(1);
  }
}

async function listProjects(api, options) {
  const spinner = ora('Fetching projects...').start();
  
  try {
    const result = await api.listProjects();
    spinner.succeed(`Found ${result.projects.length} projects`);
    
    if (result.projects.length === 0) {
      showInfo('No projects found');
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log('\n' + chalk.bold('Projects:'));
    console.log('─'.repeat(60));
    
    result.projects.forEach(project => {
      console.log(`${chalk.cyan('📁')} ${chalk.bold(project.name)}`);
      if (project.description) {
        console.log(`   ${chalk.gray(project.description)}`);
      }
      console.log(`   Tasks: ${project.taskCount} | Completed: ${project.completedCount}`);
      if (project.totalTime) {
        console.log(`   Total time: ${Math.round(project.totalTime / 60)} minutes`);
      }
      console.log('');
    });
    
  } catch (error) {
    spinner.fail('Failed to fetch projects');
    throw error;
  }
}

async function showProject(api, projectName, options) {
  const spinner = ora(`Fetching project: ${projectName}...`).start();
  
  try {
    const result = await api.getProject(projectName, { 
      includeTasks: true,
      includeStats: true 
    });
    spinner.succeed(`Project details retrieved`);
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const project = result.project;
    
    console.log('\n' + chalk.bold(`📁 Project: ${project.name}`));
    console.log('─'.repeat(60));
    
    if (project.description) {
      console.log(`${chalk.gray('Description:')} ${project.description}`);
    }
    
    if (project.path) {
      console.log(`${chalk.gray('File:')} ${project.path}`);
    }
    
    // Project stats
    console.log(`${chalk.cyan('Total tasks:')} ${project.taskCount}`);
    console.log(`${chalk.green('Completed:')} ${project.completedCount}`);
    console.log(`${chalk.yellow('In progress:')} ${project.inProgressCount}`);
    console.log(`${chalk.red('Todo:')} ${project.todoCount}`);
    
    if (project.totalTime) {
      console.log(`${chalk.blue('Total time:')} ${Math.round(project.totalTime / 60)} minutes`);
    }
    
    if (project.averageCompletionTime) {
      console.log(`${chalk.magenta('Avg completion time:')} ${Math.round(project.averageCompletionTime / 60)} minutes`);
    }
    
    // Recent tasks
    if (project.tasks && project.tasks.length > 0) {
      const limit = options.limit ? parseInt(options.limit) : 10;
      const tasksToShow = project.tasks.slice(0, limit);
      
      console.log('\n' + chalk.bold('Recent Tasks:'));
      console.log('─'.repeat(50));
      
      tasksToShow.forEach((task, index) => {
        if (index > 0) console.log('');
        console.log(formatTask(task, { showId: true, compact: true }));
      });
      
      if (project.tasks.length > limit) {
        console.log(`\n${chalk.gray(`... and ${project.tasks.length - limit} more tasks`)}`);
        showInfo(`Use --limit to see more tasks`);
      }
    }
    
  } catch (error) {
    spinner.fail('Failed to fetch project');
    throw error;
  }
}

async function createProject(api, projectName, options) {
  const spinner = ora(`Creating project: ${projectName}...`).start();
  
  try {
    const projectData = {
      name: projectName,
      description: options.description || '',
      template: options.template || 'default'
    };
    
    if (options.folder) {
      projectData.folder = options.folder;
    }
    
    const result = await api.createProject(projectData);
    spinner.succeed('Project created successfully');
    
    showSuccess(`Created project: ${projectName}`);
    if (result.project.path) {
      showInfo(`Project file: ${result.project.path}`);
    }
    
  } catch (error) {
    spinner.fail('Failed to create project');
    throw error;
  }
}

async function showProjectStats(api, projectName, options) {
  const spinner = ora(`Fetching project stats: ${projectName}...`).start();
  
  try {
    const filters = { project: projectName };
    if (options.period) {
      filters.period = options.period; // week, month, year
    }
    
    const stats = await api.getProjectStats(projectName, filters);
    spinner.succeed('Project stats retrieved');
    
    console.log('\n' + chalk.bold(`📊 Project Statistics: ${projectName}`));
    console.log('─'.repeat(60));
    
    if (options.period) {
      console.log(`Period: ${options.period}`);
    }
    
    // Task completion stats
    console.log(`${chalk.green('Tasks completed:')} ${stats.tasksCompleted}`);
    console.log(`${chalk.yellow('Tasks created:')} ${stats.tasksCreated}`);
    console.log(`${chalk.cyan('Active tasks:')} ${stats.activeTasks}`);
    
    if (stats.completionRate) {
      console.log(`${chalk.magenta('Completion rate:')} ${Math.round(stats.completionRate * 100)}%`);
    }
    
    // Time stats
    if (stats.totalTimeSpent) {
      console.log(`${chalk.blue('Total time spent:')} ${Math.round(stats.totalTimeSpent / 60)} minutes`);
    }
    
    if (stats.averageTaskTime) {
      console.log(`${chalk.gray('Average time per task:')} ${Math.round(stats.averageTaskTime / 60)} minutes`);
    }
    
    // Velocity stats
    if (stats.tasksPerDay) {
      console.log(`${chalk.cyan('Tasks per day:')} ${stats.tasksPerDay.toFixed(1)}`);
    }
    
    if (stats.productivity && stats.productivity.length > 0) {
      console.log('\n' + chalk.bold('Productivity trend (last 7 days):'));
      stats.productivity.forEach(day => {
        const bar = '█'.repeat(Math.round(day.score * 10));
        console.log(`${day.date}: ${bar} (${day.tasksCompleted} tasks)`);
      });
    }
    
    // Top contributors (if it's a multi-user project)
    if (stats.contributors && stats.contributors.length > 0) {
      console.log('\n' + chalk.bold('Top contributors:'));
      stats.contributors.slice(0, 5).forEach((contributor, index) => {
        console.log(`${index + 1}. ${contributor.name}: ${contributor.tasksCompleted} tasks`);
      });
    }
    
  } catch (error) {
    spinner.fail('Failed to fetch project stats');
    throw error;
  }
}

module.exports = { handler };