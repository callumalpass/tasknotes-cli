const readline = require('readline');
const TaskNotesAPI = require('../lib/api');
const { showError, showSuccess, formatPreview, colors } = require('../lib/utils');

let api;
let lastInput = '';
let previewTimer = null;

async function handler() {
  try {
    api = new TaskNotesAPI();
    
    // Test connection first
    const connected = await api.testConnection();
    if (!connected) {
      showError('Cannot connect to TaskNotes API. Make sure TaskNotes is running with API enabled.');
      process.exit(1);
    }

    showSuccess('Connected to TaskNotes API');
    console.log(colors.info('📝 TaskNotes Interactive Mode'));
    console.log(colors.dim('Type your task description to see real-time parsing preview'));
    console.log(colors.dim('Press Enter to create task, Ctrl+C to exit\n'));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: colors.highlight('> ')
    });

    rl.prompt();

    rl.on('line', async (input) => {
      const trimmedInput = input.trim();
      
      if (!trimmedInput) {
        rl.prompt();
        return;
      }

      // Create the task
      console.log(colors.dim('\nCreating task...'));
      
      try {
        const result = await api.createTask(trimmedInput);
        
        showSuccess('Task created successfully!');
        console.log(`  Title: ${result.task.title}`);
        console.log(`  File: ${result.task.filePath || result.task.id}`);
        
        if (result.parsed) {
          console.log('\nParsed fields:');
          console.log(formatPreview(result.parsed));
        }
        
        console.log(''); // Empty line
        rl.prompt();
        
      } catch (error) {
        showError(error.message);
        console.log(''); // Empty line
        rl.prompt();
      }
    });

    rl.on('close', () => {
      console.log('\nGoodbye!');
      process.exit(0);
    });

    // Handle input changes for preview
    rl.input.on('keypress', (str, key) => {
      if (key && (key.name === 'return' || key.name === 'enter')) {
        return; // Let the line handler deal with this
      }

      // Clear existing timer
      if (previewTimer) {
        clearTimeout(previewTimer);
      }

      // Set new timer for preview
      previewTimer = setTimeout(() => {
        const currentInput = rl.line.trim();
        if (currentInput && currentInput !== lastInput) {
          lastInput = currentInput;
          showPreview(currentInput);
        }
      }, 500); // 500ms delay
    });

  } catch (error) {
    showError(`Interactive mode failed: ${error.message}`);
    process.exit(1);
  }
}

async function showPreview(input) {
  try {
    const result = await api.parseText(input);
    const parsed = result.parsed;
    
    // Clear current line and move up to show preview
    process.stdout.write('\r\x1b[K'); // Clear current line
    process.stdout.write('\x1b[1A'); // Move up one line
    process.stdout.write('\r\x1b[K'); // Clear that line too
    
    // Show preview
    console.log(colors.dim('Preview:'), formatPreviewInline(parsed));
    console.log(colors.highlight('> ') + input);
    
  } catch (error) {
    // Silently ignore preview errors
  }
}

function formatPreviewInline(parsed) {
  const parts = [];
  
  if (parsed.title) {
    parts.push(colors.info(`"${parsed.title}"`));
  }
  
  if (parsed.priority) {
    const priorityColor = colors.priority[parsed.priority] || colors.info;
    parts.push(priorityColor(`[${parsed.priority.toUpperCase()}]`));
  }
  
  if (parsed.tags && parsed.tags.length > 0) {
    parts.push(parsed.tags.map(tag => colors.highlight(`#${tag}`)).join(' '));
  }
  
  if (parsed.contexts && parsed.contexts.length > 0) {
    parts.push(parsed.contexts.map(ctx => colors.highlight(`@${ctx}`)).join(' '));
  }
  
  if (parsed.projects && parsed.projects.length > 0) {
    parts.push(parsed.projects.map(proj => colors.highlight(`+${proj}`)).join(' '));
  }
  
  if (parsed.dueDate) {
    const dueStr = parsed.dueTime ? `${parsed.dueDate} ${parsed.dueTime}` : parsed.dueDate;
    parts.push(colors.warning(`due:${dueStr}`));
  }
  
  if (parsed.scheduledDate) {
    const scheduledStr = parsed.scheduledTime ? `${parsed.scheduledDate} ${parsed.scheduledTime}` : parsed.scheduledDate;
    parts.push(colors.info(`scheduled:${scheduledStr}`));
  }
  
  if (parsed.estimate) {
    parts.push(colors.dim(`~${parsed.estimate}m`));
  }
  
  return parts.join(' ');
}

module.exports = { handler };