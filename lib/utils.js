const chalk = require('chalk');
const { format } = require('date-fns');

// Color scheme for different elements
const colors = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  dim: chalk.gray,
  highlight: chalk.cyan,
  priority: {
    high: chalk.red,
    medium: chalk.yellow,
    low: chalk.green
  },
  status: {
    todo: chalk.blue,
    'in-progress': chalk.yellow,
    completed: chalk.green,
    cancelled: chalk.gray
  }
};

function formatTask(task, options = {}) {
  const { compact = false, showId = false } = options;
  
  let output = '';
  
  // Task title with status color
  const statusColor = colors.status[task.status] || chalk.white;
  output += statusColor(`${getStatusIcon(task.status)} ${task.title}`);
  
  // Priority indicator
  if (task.priority && task.priority !== 'medium') {
    const priorityColor = colors.priority[task.priority] || chalk.white;
    output += ` ${priorityColor(`[${task.priority.toUpperCase()}]`)}`;
  }
  
  if (!compact) {
    output += '\n';
    
    // Tags
    if (task.tags && task.tags.length > 0) {
      output += `  ${colors.dim('Tags:')} ${task.tags.map(tag => colors.highlight(`#${tag}`)).join(' ')}\n`;
    }
    
    // Contexts
    if (task.contexts && task.contexts.length > 0) {
      output += `  ${colors.dim('Contexts:')} ${task.contexts.map(ctx => colors.highlight(`@${ctx}`)).join(' ')}\n`;
    }
    
    // Projects
    if (task.projects && task.projects.length > 0) {
      output += `  ${colors.dim('Projects:')} ${task.projects.map(proj => colors.highlight(`+${proj}`)).join(' ')}\n`;
    }
    
    // Due date
    if (task.due) {
      const dueDate = new Date(task.due);
      const now = new Date();
      const isOverdue = dueDate < now && task.status !== 'completed';
      const dueDateStr = format(dueDate, 'yyyy-MM-dd HH:mm');
      const dueColor = isOverdue ? colors.error : colors.info;
      output += `  ${colors.dim('Due:')} ${dueColor(dueDateStr)}${isOverdue ? colors.error(' (OVERDUE)') : ''}\n`;
    }
    
    // Scheduled date
    if (task.scheduled) {
      const scheduledDate = format(new Date(task.scheduled), 'yyyy-MM-dd HH:mm');
      output += `  ${colors.dim('Scheduled:')} ${colors.info(scheduledDate)}\n`;
    }
    
    // Time estimate
    if (task.timeEstimate) {
      output += `  ${colors.dim('Estimate:')} ${formatDuration(task.timeEstimate)}\n`;
    }
    
    // File path (if showing ID)
    if (showId && task.id) {
      output += `  ${colors.dim('ID:')} ${colors.dim(task.id)}\n`;
    }
  }
  
  return output;
}

function getStatusIcon(status) {
  const icons = {
    'todo': '☐',
    'in-progress': '◐',
    'completed': '☑',
    'cancelled': '☒'
  };
  return icons[status] || '○';
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatPreview(parsed) {
  let output = '';
  
  // Title
  output += `${colors.highlight('Title:')} ${parsed.title || colors.dim('(empty)')}\n`;
  
  // Priority
  if (parsed.priority) {
    const priorityColor = colors.priority[parsed.priority] || chalk.white;
    output += `${colors.highlight('Priority:')} ${priorityColor(parsed.priority)}\n`;
  }
  
  // Status
  if (parsed.status && parsed.status !== 'todo') {
    const statusColor = colors.status[parsed.status] || chalk.white;
    output += `${colors.highlight('Status:')} ${statusColor(parsed.status)}\n`;
  }
  
  // Tags
  if (parsed.tags && parsed.tags.length > 0) {
    output += `${colors.highlight('Tags:')} ${parsed.tags.map(tag => colors.info(`#${tag}`)).join(' ')}\n`;
  }
  
  // Contexts
  if (parsed.contexts && parsed.contexts.length > 0) {
    output += `${colors.highlight('Contexts:')} ${parsed.contexts.map(ctx => colors.info(`@${ctx}`)).join(' ')}\n`;
  }
  
  // Projects
  if (parsed.projects && parsed.projects.length > 0) {
    output += `${colors.highlight('Projects:')} ${parsed.projects.map(proj => colors.info(`+${proj}`)).join(' ')}\n`;
  }
  
  // Due date
  if (parsed.dueDate) {
    const dueStr = parsed.dueTime ? `${parsed.dueDate} ${parsed.dueTime}` : parsed.dueDate;
    output += `${colors.highlight('Due:')} ${colors.info(dueStr)}\n`;
  }
  
  // Scheduled date
  if (parsed.scheduledDate) {
    const scheduledStr = parsed.scheduledTime ? `${parsed.scheduledDate} ${parsed.scheduledTime}` : parsed.scheduledDate;
    output += `${colors.highlight('Scheduled:')} ${colors.info(scheduledStr)}\n`;
  }
  
  // Time estimate
  if (parsed.estimate) {
    output += `${colors.highlight('Estimate:')} ${colors.info(formatDuration(parsed.estimate))}\n`;
  }
  
  // Recurrence
  if (parsed.recurrence) {
    output += `${colors.highlight('Recurrence:')} ${colors.info(parsed.recurrence)}\n`;
  }
  
  return output.trim();
}

function showError(message) {
  console.error(colors.error(`Error: ${message}`));
}

function showSuccess(message) {
  console.log(colors.success(`✓ ${message}`));
}

function showWarning(message) {
  console.warn(colors.warning(`⚠ ${message}`));
}

function showInfo(message) {
  console.log(colors.info(`ℹ ${message}`));
}

function truncateString(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

function parseKeyValue(input) {
  const match = input.match(/^([^=]+)=(.*)$/);
  if (!match) {
    throw new Error('Invalid format. Use key=value');
  }
  return { key: match[1].trim(), value: match[2].trim() };
}

module.exports = {
  colors,
  formatTask,
  formatPreview,
  formatDuration,
  getStatusIcon,
  showError,
  showSuccess,
  showWarning,
  showInfo,
  truncateString,
  parseKeyValue
};