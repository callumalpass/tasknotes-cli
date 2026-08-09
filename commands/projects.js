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
        showError('Project creation not supported - projects are created automatically when tasks are assigned to them');
        showInfo('To add a task to a project, use: tn "Task title +projectname"');
        process.exit(1);
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
        showError('Invalid projects action. Use: list, show, or stats');
        process.exit(1);
    }
  } catch (error) {
    showError(`Projects operation failed: ${error.message}`);
    process.exit(1);
  }
}

async function listProjects(api, options) {
  const spinner = ora('Extracting projects from tasks...').start();
  
  // Get all tasks and extract unique projects
  const result = await api.listTasks({ limit: 1000, archived: 'false' }); // Get active tasks
  spinner.succeed('Projects extracted from tasks');

  // Extract unique projects from all tasks
  const projectMap = new Map();
  result.tasks.forEach(task => {
    if (task.projects && task.projects.length > 0) {
      task.projects.forEach(project => {
        // Skip null, undefined, or non-string projects
        if (!project || typeof project !== 'string') {
          return;
        }
        
        // Clean up project name (remove [[]] wikilink syntax)
        const cleanProject = project.replace(/^\[\[|\]\]$/g, '');
        
        if (!projectMap.has(cleanProject)) {
          projectMap.set(cleanProject, {
            name: cleanProject,
            taskCount: 0,
            completedCount: 0,
            activeCount: 0,
            inProgressCount: 0,
            lastActivity: null
          });
        }
        
        const proj = projectMap.get(cleanProject);
        proj.taskCount++;
        
        if (task.status === 'done' || task.status === 'completed') {
          proj.completedCount++;
        } else if (task.status === 'in-progress') {
          proj.inProgressCount++;
        } else {
          proj.activeCount++;
        }
        
        // Track last activity
        const modified = new Date(task.dateModified);
        if (!proj.lastActivity || modified > proj.lastActivity) {
          proj.lastActivity = modified;
        }
      });
    }
  });

  const projects = Array.from(projectMap.values()).sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });

  if (options.json) {
    console.log(JSON.stringify({ projects, total: projects.length }, null, 2));
    return;
  }

  console.log('\n' + chalk.bold('📁 Projects (from task data)'));
  console.log('─'.repeat(50));

  if (projects.length === 0) {
    console.log(chalk.dim('No projects found in tasks'));
    console.log(chalk.dim('Projects are assigned to tasks using +projectname syntax'));
    console.log(chalk.dim('Example: tn "Fix bug +website"'));
    return;
  }

  projects.forEach(project => {
    console.log(`\n${chalk.cyan('📁')} ${chalk.bold(project.name)}`);
    console.log(`   Tasks: ${project.taskCount} | Completed: ${project.completedCount} | In Progress: ${project.inProgressCount}`);
    
    if (project.lastActivity) {
      console.log(`   Last activity: ${project.lastActivity.toLocaleDateString()}`);
    }
    
    const completion = project.taskCount > 0 ? Math.round((project.completedCount / project.taskCount) * 100) : 0;
    const barLength = 20;
    const filled = Math.round(barLength * completion / 100);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    console.log(`   Progress: [${chalk.green(bar)}] ${completion}%`);
  });

  console.log(`\n${chalk.bold('Total:')} ${projects.length} projects`);
}

async function showProject(api, projectName, options) {
  const spinner = ora(`Fetching tasks for project: ${projectName}...`).start();
  
  // Get all tasks for this project
  const result = await api.listTasks({ 
    limit: 1000, 
    project: projectName,
    archived: 'false'
  });
  
  // Filter tasks - handle both plain names and [[wikilink]] format
  const projectTasks = result.tasks.filter(task => {
    if (!task.projects || task.projects.length === 0) return false;
    return task.projects.some(proj => {
      if (!proj || typeof proj !== 'string') return false;
      const cleanProj = proj.replace(/^\[\[|\]\]$/g, '');
      return cleanProj === projectName || proj === projectName || cleanProj.includes(projectName) || projectName.includes(cleanProj);
    });
  });
  
  spinner.succeed(`Found ${projectTasks.length} tasks for project`);

  if (options.json) {
    console.log(JSON.stringify({ 
      project: { name: projectName, tasks: projectTasks },
      taskCount: projectTasks.length 
    }, null, 2));
    return;
  }

  console.log('\n' + chalk.bold(`📁 Project: ${projectName}`));
  console.log('─'.repeat(60));
  
  if (projectTasks.length === 0) {
    console.log(chalk.dim(`No tasks found for project "${projectName}"`));
    console.log(chalk.dim('Tasks are assigned to projects using +projectname syntax'));
    return;
  }

  // Calculate stats
  const completed = projectTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
  const inProgress = projectTasks.filter(t => t.status === 'in-progress').length;
  const todo = projectTasks.filter(t => !t.status || t.status === 'todo').length;
  
  console.log(`${chalk.cyan('Total tasks:')} ${projectTasks.length}`);
  console.log(`${chalk.green('Completed:')} ${completed}`);
  console.log(`${chalk.yellow('In progress:')} ${inProgress}`);
  console.log(`${chalk.blue('Todo:')} ${todo}`);
  
  const completion = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
  const barLength = 30;
  const filled = Math.round(barLength * completion / 100);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  console.log(`${chalk.bold('Progress:')} [${chalk.green(bar)}] ${completion}%`);

  // Show recent tasks
  const limit = options.limit ? parseInt(options.limit) : 10;
  const recentTasks = projectTasks
    .sort((a, b) => new Date(b.dateModified) - new Date(a.dateModified))
    .slice(0, limit);
  
  console.log('\n' + chalk.bold('Recent Tasks:'));
  console.log('─'.repeat(50));
  
  recentTasks.forEach((task, index) => {
    if (index > 0) console.log('');
    console.log(formatTask(task, { showId: true, compact: true }));
  });

  if (projectTasks.length > limit) {
    console.log(`\n${chalk.dim(`... and ${projectTasks.length - limit} more tasks`)}`);
    console.log(chalk.dim(`Use --limit ${projectTasks.length} to see all tasks`));
  }
}

async function showProjectStats(api, projectName, options) {
  const spinner = ora(`Calculating stats for project: ${projectName}...`).start();
  
  // Get all tasks for this project
  const result = await api.listTasks({ 
    limit: 1000, 
    project: projectName 
  });
  
  // Filter tasks - handle both plain names and [[wikilink]] format
  const projectTasks = result.tasks.filter(task => {
    if (!task.projects || task.projects.length === 0) return false;
    return task.projects.some(proj => {
      if (!proj || typeof proj !== 'string') return false;
      const cleanProj = proj.replace(/^\[\[|\]\]$/g, '');
      return cleanProj === projectName || proj === projectName || cleanProj.includes(projectName) || projectName.includes(cleanProj);
    });
  });
  
  spinner.succeed(`Stats calculated for ${projectTasks.length} tasks`);

  if (projectTasks.length === 0) {
    console.log(chalk.dim(`No tasks found for project "${projectName}"`));
    return;
  }

  const stats = {
    total: projectTasks.length,
    completed: projectTasks.filter(t => t.status === 'done' || t.status === 'completed').length,
    inProgress: projectTasks.filter(t => t.status === 'in-progress').length,
    todo: projectTasks.filter(t => !t.status || t.status === 'todo').length,
    overdue: projectTasks.filter(t => t.due && new Date(t.due) < new Date() && t.status !== 'done' && t.status !== 'completed').length,
    withDueDate: projectTasks.filter(t => t.due).length,
    withEstimate: projectTasks.filter(t => t.estimate).length,
    avgEstimate: 0,
    totalEstimate: 0
  };

  // Calculate time estimates
  const tasksWithEstimate = projectTasks.filter(t => t.estimate && !isNaN(t.estimate));
  if (tasksWithEstimate.length > 0) {
    stats.totalEstimate = tasksWithEstimate.reduce((sum, t) => sum + parseInt(t.estimate), 0);
    stats.avgEstimate = Math.round(stats.totalEstimate / tasksWithEstimate.length);
  }

  if (options.json) {
    console.log(JSON.stringify({ project: projectName, stats }, null, 2));
    return;
  }

  console.log('\n' + chalk.bold(`📊 Project Statistics: ${projectName}`));
  console.log('─'.repeat(60));
  
  console.log(`${chalk.cyan('Total tasks:')} ${stats.total}`);
  console.log(`${chalk.green('Completed:')} ${stats.completed}`);
  console.log(`${chalk.yellow('In progress:')} ${stats.inProgress}`);
  console.log(`${chalk.blue('Todo:')} ${stats.todo}`);
  
  if (stats.overdue > 0) {
    console.log(`${chalk.red('Overdue:')} ${stats.overdue}`);
  }
  
  const completion = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const barLength = 30;
  const filled = Math.round(barLength * completion / 100);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  console.log(`${chalk.bold('Progress:')} [${chalk.green(bar)}] ${completion}%`);
  
  console.log(`${chalk.cyan('Tasks with due dates:')} ${stats.withDueDate}`);
  console.log(`${chalk.cyan('Tasks with estimates:')} ${stats.withEstimate}`);
  
  if (stats.totalEstimate > 0) {
    console.log(`${chalk.cyan('Total estimated time:')} ${Math.round(stats.totalEstimate / 60)} hours ${stats.totalEstimate % 60} minutes`);
    console.log(`${chalk.cyan('Average estimate:')} ${stats.avgEstimate} minutes`);
  }
}

module.exports = { handler };