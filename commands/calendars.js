const TaskNotesAPI = require('../lib/api');
const { showError, showSuccess, showInfo } = require('../lib/utils');
const ora = require('ora');
const chalk = require('chalk');

async function handler(action, options = {}) {
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
      case 'overview':
        await showCalendarsOverview(api, options);
        break;
      case 'google':
        await showGoogleCalendars(api, options);
        break;
      case 'microsoft':
        await showMicrosoftCalendars(api, options);
        break;
      case 'subscriptions':
      case 'subs':
        await showSubscriptions(api, options);
        break;
      case 'events':
        await showEvents(api, options);
        break;
      default:
        showError(`Unknown action: ${action}`);
        console.log('\nAvailable actions:');
        console.log('  list, overview   Show overview of all calendar sources');
        console.log('  google           Show Google Calendar connection details');
        console.log('  microsoft        Show Microsoft Calendar connection details');
        console.log('  subscriptions    Show ICS subscription details');
        console.log('  events           Show calendar events');
        process.exit(1);
    }
  } catch (error) {
    showError(`Failed to fetch calendar data: ${error.message}`);
    process.exit(1);
  }
}

async function showCalendarsOverview(api, options) {
  const dataSpinner = ora('Fetching calendar overview...').start();
  const data = await api.getCalendars();
  dataSpinner.succeed('Calendar overview retrieved');

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log('\n' + chalk.bold('Calendar Sources'));
  console.log('─'.repeat(40));

  // Providers
  if (data.providers && data.providers.length > 0) {
    console.log('\n' + chalk.bold('Providers:'));
    for (const provider of data.providers) {
      const status = provider.connected
        ? chalk.green('● Connected')
        : chalk.gray('○ Not connected');
      console.log(`  ${status} ${provider.name}`);
      if (provider.connected) {
        if (provider.email) {
          console.log(`    ${chalk.gray('Email:')} ${provider.email}`);
        }
        if (provider.calendarCount !== undefined) {
          console.log(`    ${chalk.gray('Calendars:')} ${provider.calendarCount}`);
        }
      }
    }
  }

  // Subscriptions summary
  if (data.subscriptions) {
    console.log('\n' + chalk.bold('ICS Subscriptions:'));
    console.log(`  ${chalk.cyan('Total:')} ${data.subscriptions.total}`);
    console.log(`  ${chalk.green('Enabled:')} ${data.subscriptions.enabled}`);
  }
}

async function showGoogleCalendars(api, options) {
  const dataSpinner = ora('Fetching Google Calendar info...').start();
  const data = await api.getGoogleCalendars();
  dataSpinner.succeed('Google Calendar info retrieved');

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log('\n' + chalk.bold('Google Calendar'));
  console.log('─'.repeat(40));

  if (!data.connected) {
    console.log(chalk.yellow('Not connected'));
    console.log(chalk.gray('Connect via TaskNotes settings to enable Google Calendar sync'));
    return;
  }

  console.log(chalk.green('● Connected'));
  if (data.email) {
    console.log(`${chalk.gray('Account:')} ${data.email}`);
  }
  if (data.connectedAt) {
    console.log(`${chalk.gray('Connected:')} ${new Date(data.connectedAt).toLocaleString()}`);
  }

  if (data.calendars && data.calendars.length > 0) {
    console.log('\n' + chalk.bold('Calendars:'));
    for (const cal of data.calendars) {
      const primary = cal.primary ? chalk.cyan(' (primary)') : '';
      console.log(`  • ${cal.name || cal.id}${primary}`);
    }
  }
}

async function showMicrosoftCalendars(api, options) {
  const dataSpinner = ora('Fetching Microsoft Calendar info...').start();
  const data = await api.getMicrosoftCalendars();
  dataSpinner.succeed('Microsoft Calendar info retrieved');

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log('\n' + chalk.bold('Microsoft Calendar'));
  console.log('─'.repeat(40));

  if (!data.connected) {
    console.log(chalk.yellow('Not connected'));
    console.log(chalk.gray('Connect via TaskNotes settings to enable Microsoft Calendar sync'));
    return;
  }

  console.log(chalk.green('● Connected'));
  if (data.email) {
    console.log(`${chalk.gray('Account:')} ${data.email}`);
  }
  if (data.connectedAt) {
    console.log(`${chalk.gray('Connected:')} ${new Date(data.connectedAt).toLocaleString()}`);
  }

  if (data.calendars && data.calendars.length > 0) {
    console.log('\n' + chalk.bold('Calendars:'));
    for (const cal of data.calendars) {
      const primary = cal.primary ? chalk.cyan(' (primary)') : '';
      console.log(`  • ${cal.name || cal.id}${primary}`);
    }
  }
}

async function showSubscriptions(api, options) {
  const dataSpinner = ora('Fetching ICS subscriptions...').start();
  const data = await api.getCalendarSubscriptions();
  dataSpinner.succeed('ICS subscriptions retrieved');

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log('\n' + chalk.bold('ICS Subscriptions'));
  console.log('─'.repeat(40));

  if (!data.subscriptions || data.subscriptions.length === 0) {
    console.log(chalk.gray('No ICS subscriptions configured'));
    return;
  }

  for (const sub of data.subscriptions) {
    const status = sub.enabled
      ? chalk.green('● Enabled')
      : chalk.gray('○ Disabled');
    console.log(`\n${status} ${chalk.bold(sub.name || sub.id)}`);
    if (sub.url) {
      console.log(`  ${chalk.gray('URL:')} ${sub.url}`);
    }
    if (sub.lastFetched) {
      console.log(`  ${chalk.gray('Last fetched:')} ${new Date(sub.lastFetched).toLocaleString()}`);
    }
    if (sub.lastError) {
      console.log(`  ${chalk.red('Error:')} ${sub.lastError}`);
    }
  }
}

async function showEvents(api, options) {
  const filters = {};
  if (options.start) {
    filters.start = options.start;
  }
  if (options.end) {
    filters.end = options.end;
  }

  const dataSpinner = ora('Fetching calendar events...').start();
  const data = await api.getCalendarEvents(filters);
  dataSpinner.succeed('Calendar events retrieved');

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log('\n' + chalk.bold('Calendar Events'));
  console.log('─'.repeat(40));

  // Show sources summary
  if (data.sources && Object.keys(data.sources).length > 0) {
    console.log(chalk.gray(`Sources: ${Object.entries(data.sources).map(([k, v]) => `${k}: ${v}`).join(', ')}`));
  }
  console.log(chalk.gray(`Total: ${data.total} events\n`));

  if (!data.events || data.events.length === 0) {
    console.log(chalk.gray('No events found'));
    return;
  }

  // Group events by date
  const eventsByDate = {};
  for (const event of data.events) {
    const dateStr = new Date(event.start).toLocaleDateString();
    if (!eventsByDate[dateStr]) {
      eventsByDate[dateStr] = [];
    }
    eventsByDate[dateStr].push(event);
  }

  for (const [date, events] of Object.entries(eventsByDate)) {
    console.log(chalk.bold(date));
    for (const event of events) {
      const startTime = new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endTime = event.end
        ? new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      const timeRange = endTime ? `${startTime} - ${endTime}` : startTime;
      const provider = chalk.gray(`[${event.provider}]`);
      console.log(`  ${chalk.cyan(timeRange)} ${event.summary || event.title || 'Untitled'} ${provider}`);
      if (event.location) {
        console.log(`    ${chalk.gray('Location:')} ${event.location}`);
      }
    }
    console.log();
  }
}

module.exports = { handler };
