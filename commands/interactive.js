const readline = require('readline');
const TaskNotesAPI = require('../lib/api');
const { showError, showSuccess, formatPreview, colors } = require('../lib/utils');

let api;
let lastInput = '';
let previewTimer = null;
let lastPreviewText = '';
let keyCount = 0;
let lastKeyTime = 0;
let previewCache = new Map();

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
        
        // Reset state for next input
        lastInput = '';
        lastPreviewText = '';
        keyCount = 0;
        lastKeyTime = 0;
        previewCache.clear(); // Clear cache for fresh start
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

    // Enhanced keypress handling with adaptive timing
    rl.input.on('keypress', (str, key) => {
      // Skip if it's a control key we don't want to handle
      if (key && (key.ctrl || key.meta || key.name === 'return' || key.name === 'enter')) {
        return;
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTime;
      lastKeyTime = now;
      keyCount++;

      // Clear existing timer
      if (previewTimer) {
        clearTimeout(previewTimer);
      }

      // Adaptive timing based on typing patterns and special characters
      let delay = getAdaptiveDelay(str, key, timeSinceLastKey);

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
      }, delay);
    });

  } catch (error) {
    showError(`Interactive mode failed: ${error.message}`);
    process.exit(1);
  }
}

function getAdaptiveDelay(str, key, timeSinceLastKey) {
  // Immediate update for trigger characters that often start new elements
  if (str === '@' || str === '#' || str === '+' || str === '!') {
    return 50; // Almost immediate for trigger characters
  }
  
  // Fast update after spaces (often end of words/phrases)
  if (str === ' ') {
    return 100;
  }
  
  // Backspace gets fast response since user is editing
  if (key && (key.name === 'backspace' || key.name === 'delete')) {
    return 150;
  }
  
  // Fast typing (< 100ms between keys) gets longer delay to avoid spam
  if (timeSinceLastKey < 100) {
    return 300;
  }
  
  // Moderate typing (100-300ms) gets moderate delay
  if (timeSinceLastKey < 300) {
    return 180;
  }
  
  // Slow typing (> 300ms) gets fast response - user is thinking
  return 120;
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
    // Check cache first
    if (previewCache.has(input)) {
      const cachedPreview = previewCache.get(input);
      if (cachedPreview !== lastPreviewText) {
        lastPreviewText = cachedPreview;
        updatePreview(cachedPreview);
      }
      return;
    }

    // Show immediate partial preview for common patterns while API loads
    const quickPreview = getQuickPreview(input);
    if (quickPreview && quickPreview !== lastPreviewText) {
      updatePreview(quickPreview + colors.dim(' (parsing...)'));
    }

    const result = await api.parseText(input);
    const parsed = result.parsed;
    
    const previewText = formatPreviewInline(parsed);
    
    // Cache the result (keep only last 20 entries)
    if (previewCache.size >= 20) {
      const firstKey = previewCache.keys().next().value;
      previewCache.delete(firstKey);
    }
    previewCache.set(input, previewText);
    
    if (previewText && previewText !== lastPreviewText) {
      lastPreviewText = previewText;
      updatePreview(previewText);
    }
    
  } catch (error) {
    // Silently ignore preview errors but remove loading indicator
    if (lastPreviewText.includes('(parsing...)')) {
      updatePreview(lastPreviewText.replace(colors.dim(' (parsing...)'), ''));
    }
  }
}

function getQuickPreview(input) {
  // Provide immediate visual feedback for common patterns
  const parts = [];
  
  // Extract basic patterns without full NLP
  const words = input.split(/\s+/);
  const lowerInput = input.toLowerCase();
  let title = '';
  
  // Check for "every" patterns first
  if (lowerInput.includes('every day') || lowerInput.includes('everyday')) {
    parts.push(colors.highlight('🔄 Daily'));
  } else if (lowerInput.includes('every week')) {
    parts.push(colors.highlight('🔄 Weekly'));
  } else if (lowerInput.includes('every month')) {
    parts.push(colors.highlight('🔄 Monthly'));
  } else if (lowerInput.includes('every year')) {
    parts.push(colors.highlight('🔄 Yearly'));
  }
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    if (word.startsWith('@')) {
      parts.push(colors.highlight(word));
    } else if (word.startsWith('#')) {
      parts.push(colors.highlight(word));
    } else if (word.startsWith('+')) {
      parts.push(colors.highlight(word));
    } else if (word.match(/^!{1,3}$/)) {
      const priority = word.length === 1 ? 'low' : word.length === 2 ? 'medium' : 'high';
      parts.push(colors.priority[priority] ? colors.priority[priority](`[${priority.toUpperCase()}]`) : colors.info(`[${priority.toUpperCase()}]`));
    } else if (word.toLowerCase().includes('urgent')) {
      parts.push(colors.warning('[URGENT]'));
    } else if (word.toLowerCase().includes('high')) {
      parts.push(colors.warning('[HIGH]'));
    } else if (word.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      parts.push(colors.warning(`due:${tomorrow.toISOString().split('T')[0]}`));
    } else if (word.toLowerCase().includes('today')) {
      const today = new Date().toISOString().split('T')[0];
      parts.push(colors.warning(`due:${today}`));
    } else if (word.toLowerCase() === 'daily' || word.toLowerCase() === 'everyday') {
      parts.push(colors.highlight('🔄 Daily'));
    } else if (word.toLowerCase() === 'weekly') {
      parts.push(colors.highlight('🔄 Weekly'));
    } else if (word.toLowerCase() === 'monthly') {
      parts.push(colors.highlight('🔄 Monthly'));
    } else if (word.toLowerCase() === 'yearly' || word.toLowerCase() === 'annually') {
      parts.push(colors.highlight('🔄 Yearly'));
    } else if (word.toLowerCase().includes('monday')) {
      parts.push(colors.highlight('🔄 Every Monday'));
    } else if (word.toLowerCase().includes('tuesday')) {
      parts.push(colors.highlight('🔄 Every Tuesday'));
    } else if (word.toLowerCase().includes('wednesday')) {
      parts.push(colors.highlight('🔄 Every Wednesday'));
    } else if (word.toLowerCase().includes('thursday')) {
      parts.push(colors.highlight('🔄 Every Thursday'));
    } else if (word.toLowerCase().includes('friday')) {
      parts.push(colors.highlight('🔄 Every Friday'));
    } else if (word.toLowerCase().includes('saturday')) {
      parts.push(colors.highlight('🔄 Every Saturday'));
    } else if (word.toLowerCase().includes('sunday')) {
      parts.push(colors.highlight('🔄 Every Sunday'));
    } else if (!word.startsWith('@') && !word.startsWith('#') && !word.startsWith('+') && !word.match(/^!{1,3}$/)) {
      title += (title ? ' ' : '') + word;
    }
  }
  
  if (title) {
    parts.unshift(colors.info(`"${title}"`));
  }
  
  return parts.length > 0 ? parts.join(' ') : null;
}

function formatRecurrence(rrule) {
  if (!rrule) return null;
  
  // Convert RRULE to human-readable format
  if (rrule === 'FREQ=DAILY') {
    return '🔄 Daily';
  } else if (rrule === 'FREQ=WEEKLY') {
    return '🔄 Weekly';
  } else if (rrule.includes('FREQ=WEEKLY;BYDAY=')) {
    const dayMatch = rrule.match(/BYDAY=([A-Z,]+)/);
    if (dayMatch) {
      const days = dayMatch[1].split(',').map(day => {
        const dayMap = {
          'MO': 'Monday', 'TU': 'Tuesday', 'WE': 'Wednesday', 
          'TH': 'Thursday', 'FR': 'Friday', 'SA': 'Saturday', 'SU': 'Sunday'
        };
        return dayMap[day] || day;
      });
      if (days.length === 1) {
        return `🔄 Every ${days[0]}`;
      } else {
        return `🔄 Every ${days.join(', ')}`;
      }
    }
    return '🔄 Weekly';
  } else if (rrule === 'FREQ=MONTHLY') {
    return '🔄 Monthly';
  } else if (rrule === 'FREQ=YEARLY') {
    return '🔄 Yearly';
  } else if (rrule.includes('INTERVAL=')) {
    const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
    const freqMatch = rrule.match(/FREQ=(\w+)/);
    if (intervalMatch && freqMatch) {
      const interval = intervalMatch[1];
      const freq = freqMatch[1].toLowerCase();
      return `🔄 Every ${interval} ${freq}${interval > 1 ? 's' : ''}`;
    }
  }
  
  // Fallback: show simplified RRULE
  return `🔄 ${rrule.replace('FREQ=', '').toLowerCase()}`;
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
  
  if (parsed.recurrence) {
    const recurrenceText = formatRecurrence(parsed.recurrence);
    if (recurrenceText) {
      parts.push(colors.highlight(recurrenceText));
    }
  }
  
  return parts.join(' ');
}

module.exports = { handler };