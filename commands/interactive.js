const readline = require('readline');
const TaskNotesAPI = require('../lib/api');
const { showError, showSuccess, formatPreview, colors } = require('../lib/utils');

let api;
let lastInput = '';
let previewTimer = null;
let lastPreviewText = '';

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
    console.log(colors.dim('Type your task description and press Enter to create'));
    console.log(colors.dim('Press Ctrl+C to exit'));
    console.log('─'.repeat(process.stdout.columns || 80));
    
    // Reserve space for preview
    console.log(colors.dim('Preview: (will appear here as you type)'));
    console.log('─'.repeat(process.stdout.columns || 80));
    console.log('');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: colors.highlight('Task: ')
    });

    rl.prompt();

    rl.on('line', async (input) => {
      const trimmedInput = input.trim();
      
      if (!trimmedInput) {
        rl.prompt();
        return;
      }

      // Clear current line and show creating message
      process.stdout.write('\r\x1b[K');
      console.log(colors.dim('Creating task...'));
      
      try {
        const result = await api.createTask(trimmedInput);
        
        showSuccess('Task created successfully!');
        console.log(`  Title: ${result.task.title}`);
        console.log(`  File: ${result.task.filePath || result.task.id}`);
        
        if (result.parsed) {
          console.log('\nParsed fields:');
          console.log(formatPreview(result.parsed));
        }
        
        console.log('\n' + '─'.repeat(process.stdout.columns || 80));
        console.log(colors.dim('Preview: (will appear here as you type)'));
        console.log('─'.repeat(process.stdout.columns || 80));
        console.log('');
        
        lastInput = '';
        lastPreviewText = '';
        rl.prompt();
        
      } catch (error) {
        showError(error.message);
        console.log('');
        rl.prompt();
      }
    });

    rl.on('close', () => {
      console.log('\nGoodbye!');
      process.exit(0);
    });

    // Simple keypress handling without raw mode
    rl.input.on('keypress', (str, key) => {
      // Skip if it's a control key we don't want to handle
      if (key && (key.ctrl || key.meta || key.name === 'return' || key.name === 'enter')) {
        return;
      }

      // Clear existing timer
      if (previewTimer) {
        clearTimeout(previewTimer);
      }

      // Set new timer for preview
      previewTimer = setTimeout(() => {
        const currentInput = rl.line ? rl.line.trim() : '';
        if (currentInput && currentInput !== lastInput) {
          lastInput = currentInput;
          showPreview(currentInput);
        } else if (!currentInput && lastPreviewText) {
          updatePreview('(will appear here as you type)');
          lastPreviewText = '';
        }
      }, 500); // 500ms delay to avoid too frequent updates
    });

  } catch (error) {
    showError(`Interactive mode failed: ${error.message}`);
    process.exit(1);
  }
}

function updatePreview(text) {
  // Save current cursor position
  process.stdout.write('\x1b[s'); // Save cursor
  process.stdout.write('\x1b[3A'); // Move up 3 lines to the preview line
  process.stdout.write('\r\x1b[K'); // Clear line
  process.stdout.write(colors.dim('Preview: ') + text);
  process.stdout.write('\x1b[u'); // Restore cursor
}

async function showPreview(input) {
  try {
    const result = await api.parseText(input);
    const parsed = result.parsed;
    
    const previewText = formatPreviewInline(parsed);
    if (previewText && previewText !== lastPreviewText) {
      lastPreviewText = previewText;
      updatePreview(previewText);
    }
    
  } catch (error) {
    // Silently ignore preview errors
  }
}

function formatPreviewInline(parsed) {
  const parts = [];
  
  if (parsed.title) {
    parts.push(colors.info(`"${parsed.title}"`));
  }
  
  if (parsed.status) {
    const statusColor = colors.status[parsed.status] || colors.info;
    parts.push(statusColor(`[${parsed.status.toUpperCase()}]`));
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