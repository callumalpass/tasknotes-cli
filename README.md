# TaskNotes CLI

A powerful command-line interface for TaskNotes with interactive mode and real-time NLP preview.

## Features

- 🚀 **Quick Task Creation**: Create tasks with natural language parsing
- 🖥️ **Interactive Mode**: Real-time preview as you type
- 📋 **Task Management**: List, search, and complete tasks
- 🎯 **Smart Parsing**: Extract dates, priorities, tags, contexts, and more
- ⚙️ **Easy Configuration**: Auto-discovery and simple setup

## Installation

### From npm (coming soon)
```bash
npm install -g tasknotes-cli
```

### From source
```bash
git clone https://github.com/callumalpass/tasknotes-cli.git
cd tasknotes-cli
npm install
npm link  # Creates global 'tn' command
```

## Quick Start

1. **Configure connection** (first time only):
   ```bash
   tn config
   ```

2. **Create a task** with natural language:
   ```bash
   tn "Review PR #123 tomorrow high priority @work"
   ```

3. **Enter interactive mode** for real-time preview:
   ```bash
   tn
   ```

## Usage

### Basic Commands

```bash
# Quick task creation
tn "Buy groceries tomorrow #personal"

# Interactive mode with preview
tn

# List tasks
tn list
tn list --today
tn list --overdue

# Complete a task
tn complete "TaskNotes/Tasks/Buy groceries.md"

# Search tasks
tn search "groceries"

# Configuration
tn config
tn config --set host=192.168.1.100
tn config --list
```

### Interactive Mode

The interactive mode provides real-time parsing preview as you type:

```
┌─ TaskNotes Interactive Mode ────────────────────────┐
│ 📝 Type your task and see real-time parsing preview │
└─────────────────────────────────────────────────────┘

┌─ 🔍 Task Preview: ──────────────────────────────────┐
│ Title: Review PR                                    │
│ Priority: high                                      │
│ Tags: #123                                         │
│ Contexts: @work                                    │
│ Due: tomorrow                                      │
└─────────────────────────────────────────────────────┘

┌─ 💭 Type your task: ────────────────────────────────┐
│ > Review PR #123 tomorrow high priority @work_     │
└─────────────────────────────────────────────────────┘

[Enter] Create Task  [Esc] Cancel  [Ctrl+C] Exit
```

## Natural Language Parsing

TaskNotes CLI supports rich natural language parsing:

### Dates and Times
- `tomorrow`, `friday`, `next week`
- `today at 6pm`, `2024-12-25`
- `due friday`, `scheduled tomorrow`

### Priority Levels
- `high priority`, `low priority`, `urgent`
- `!!!` (high), `!!` (medium), `!` (low)

### Tags, Contexts, Projects
- Tags: `#personal`, `#work`, `#123`
- Contexts: `@home`, `@office`, `@urgent`
- Projects: `+website`, `+mobile-app`

### Time Estimates
- `2h`, `30min`, `estimate 45m`

### Recurrence
- `daily`, `weekly`, `every monday`

### Examples

```bash
# Complex task with multiple attributes
tn "Fix authentication bug #456 due friday 2pm high priority @backend estimate 2h"

# Weekly recurring task
tn "Team standup every monday 9am @work"

# Simple personal reminder
tn "Call mom tomorrow #family"

# Project task with estimate
tn "Update website homepage +website due next week estimate 4h"
```

## Configuration

### Auto-Discovery

The CLI automatically tries to find your TaskNotes API:
- Checks common ports: 8080, 3000, 8000, 8081
- Tests localhost and 127.0.0.1

### Manual Configuration

```bash
# Interactive setup
tn config

# Set specific values
tn config --set host=localhost
tn config --set port=8080
tn config --set authToken=your-token

# View current config
tn config --list
```

### Configuration File

Config is stored at `~/.tasknotes-cli/config.json`:

```json
{
  "host": "localhost",
  "port": 8080,
  "authToken": null,
  "dateFormat": "yyyy-MM-dd",
  "timeFormat": "HH:mm",
  "defaultPriority": "medium",
  "maxResults": 20
}
```

## Requirements

- Node.js 14 or higher
- TaskNotes plugin running in Obsidian with API enabled
- Network connection to TaskNotes API (usually localhost)

## Troubleshooting

### Cannot connect to API
1. Make sure TaskNotes is running in Obsidian
2. Check that the API service is enabled in TaskNotes settings
3. Verify the host and port in your configuration
4. Try auto-discovery: `tn config`

### Command not found
If `tn` command is not found after installation:
```bash
# Check if npm global bin is in PATH
npm config get prefix

# Link manually if needed
cd tasknotes-cli
npm link
```

### Permission errors
```bash
# Fix npm permissions (macOS/Linux)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
# Add ~/.npm-global/bin to your PATH
```

## Development

```bash
# Clone and setup
git clone https://github.com/callumalpass/tasknotes-cli.git
cd tasknotes-cli
npm install

# Run locally
node bin/tn

# Link for global testing
npm link

# Run tests
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.