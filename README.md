# TaskNotes CLI

A command-line interface for TaskNotes with interactive mode and real-time NLP preview.

## Features

-  **Quick Task Creation**: Create tasks with natural language parsing
-  **Interactive Mode**: Real-time preview as you type
-  **Task Management**: List, search, and complete tasks
-  **Advanced Filtering**: Complex query expressions with logical operators
-  **Smart Parsing**: Extract dates, priorities, tags, contexts, and more
-  **FZF Integration**: Interactive fuzzy-search task browser with preview
-  **JSON Output**: Machine-readable output for automation and scripting
-  **Full File Paths**: Access to complete vault paths for external tools
-  **Easy Configuration**: Auto-discovery and simple setup

## Installation

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
tn list --completed

# Advanced filtering
tn list --filter "priority:urgent"
tn list --filter "tags:project AND status:in-progress"
tn list --filter "(due:before:2025-08-20 OR tags:urgent) AND priority:high"

# JSON output for automation
tn list --json
tn list --filter "priority:urgent" --json

# Interactive fuzzy search (requires fzf)
tn-fzf
tn-fzf "priority:urgent"
tn-fzf --today --limit 50

# Complete a task
tn complete "TaskNotes/Tasks/Buy groceries.md"

# Search tasks
tn search "groceries"

# Configuration
tn config
tn config --set host=192.168.1.100
tn config --list

# View filter syntax help
tn filter-help
```

### Interactive Mode

The interactive mode provides real-time parsing preview as you type:

```
┌─ TaskNotes Interactive Mode ────────────────────────┐
│  Type your task and see real-time parsing preview   │
└─────────────────────────────────────────────────────┘

┌─  Task Preview: ──────────────────────────────────┐
│ Review PR [high] #123 @work 2025-08-13            │
└───────────────────────────────────────────────────┘

┌─  Type your task: ────────────────────────────────┐
│ > Review PR #123 tomorrow high priority @work_     │
└─────────────────────────────────────────────────────┘

[Enter] Create Task  [Esc] Cancel  [Ctrl+C] Exit
```

## Advanced Filtering

TaskNotes CLI supports TaskNotes filtering system with logical operators and complex expressions.

### Filter Syntax

```bash
# Basic property filters
tn list --filter "priority:urgent"
tn list --filter "status:in-progress"
tn list --filter "tags:project"

# Text search
tn list --filter "title:meeting"
tn list --filter "title:contains:notes"

# Date filtering
tn list --filter "due:before:2025-08-20"
tn list --filter "scheduled:after:2025-08-10"

# Logical operators
tn list --filter "priority:urgent AND tags:work"
tn list --filter "priority:urgent OR priority:high"

# Complex grouping with parentheses
tn list --filter "(priority:urgent OR priority:high) AND tags:project"
tn list --filter "status:in-progress AND (due:before:2025-08-20 OR tags:urgent)"
```

### Available Properties

- **Text**: `title`
- **Categories**: `status`, `priority`, `tags`, `contexts`, `projects`
- **Dates**: `due`, `scheduled`, `completed`, `created`, `modified`
- **Flags**: `archived`
- **Numbers**: `estimate` (time in minutes)

### Available Operators

- **Comparison**: `is`, `is-not`, `equals`, `not-equals`
- **Text**: `contains`, `does-not-contain`
- **Dates**: `before`, `after`, `on-or-before`, `on-or-after`
- **Existence**: `empty`, `not-empty`
- **Numbers**: `greater-than`, `less-than`

### Property Aliases

For convenience, you can use shorter aliases:
- `tag` → `tags`
- `context` → `contexts`
- `project` → `projects`
- `created` → `file.ctime`
- `modified` → `file.mtime`

## FZF Integration

The `tn-fzf` command provides an interactive fuzzy-search interface for browsing tasks.

### Installation Requirements

```bash
# Install fzf (fuzzy finder)
# Ubuntu/Debian:
sudo apt install fzf

# macOS:
brew install fzf

# Or follow: https://github.com/junegunn/fzf#installation
```

### Usage

```bash
# Basic fuzzy search
tn-fzf

# With filtering
tn-fzf "priority:urgent"
tn-fzf --today
tn-fzf --overdue --limit 100

# Disable preview panel
tn-fzf --no-preview
```

### Interface Features

**Rich Task Display:**

```
○ Take vitamins [URGENT] 📅06/08 ⏰08/10 #health @personal
◐ Code review [HIGH] 📅06/12 ⏰08/08 #work @office +project
● Completed task ⏰06/15 #done
```

**Keybindings:**

- `ENTER` - Open task in Obsidian
- `Ctrl-E` - Open task in $EDITOR (vim, code, etc.)
- `Alt-A` - Add new task (interactive mode)
- `Ctrl-R` - Refresh task list
- `Ctrl-C` - Exit

**Status Icons:**

- `○` - Open/Todo
- `◐` - In Progress
- `●` - Completed/Done
- `✗` - Cancelled
- `⏸` - Waiting

**Features:**

- Real-time file preview with syntax highlighting
- Fuzzy search across all task fields
- Sorted by scheduled date
- Works with all filter expressions
- Direct integration with Obsidian and external editors

## JSON Output & Automation

All list commands support `--json` output for scripting and automation.

### JSON Structure

```json
{
  "success": true,
  "data": {
    "tasks": [...],
    "total": 262,
    "filtered": 72,
    "count": 20,
    "vault": {
      "name": "MyVault",
      "path": "/home/user/vaults/MyVault"
    }
  },
  "meta": {
    "filter": "priority:urgent",
    "completed": false,
    "limit": 20
  }
}
```

### Automation Examples

```bash
# Get all urgent task titles
tn list --filter "priority:urgent" --json | jq -r '.data.tasks[].title'

# Get full file paths for external processing
tn list --json | jq -r '.data.vault.path as $vault | .data.tasks[] | $vault + "/" + .path'

# Count tasks by status
tn list --json | jq '.data.tasks | group_by(.status) | map({status: .[0].status, count: length})'

# Export overdue tasks to CSV
tn list --overdue --json | jq -r '.data.tasks[] | [.title, .due, .priority] | @csv'

# Open all urgent tasks in VS Code
tn list --filter "priority:urgent" --json | jq -r '.data.vault.path as $vault | .data.tasks[] | $vault + "/" + .path' | xargs code

# Backup all project tasks
tn list --filter "tags:project" --json | jq -r '.data.vault.path as $vault | .data.tasks[] | $vault + "/" + .path' | xargs -I {} cp {} /backup/
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
  "maxResults": 20
}
```

## Requirements

### Core Requirements

- Node.js 14 or higher
- TaskNotes plugin running in Obsidian with API enabled
- Network connection to TaskNotes API (usually localhost)

### Optional Requirements

- `fzf` - For interactive fuzzy search (`tn-fzf` command)
- `jq` - For JSON processing in automation scripts
- `bat` or `highlight` - For syntax highlighting in file previews
- External editor (VS Code, Vim, etc.) - For `Ctrl-E` editing in fzf mode

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

### FZF issues

```bash
# Install fzf if tn-fzf doesn't work
# Ubuntu/Debian:
sudo apt install fzf

# macOS:
brew install fzf

# Check if fzf is in PATH
which fzf
```

### Filter syntax errors

```bash
# Get help with filter syntax
tn filter-help

# Common mistakes:
# ❌ Wrong: tn list --filter priority=urgent
# ✅ Right: tn list --filter "priority:urgent"

# ❌ Wrong: tn list --filter "tags contains work"  
# ✅ Right: tn list --filter "tags:contains:work"
```

### JSON output issues

```bash
# Make sure jq is installed for examples
sudo apt install jq  # Ubuntu/Debian
brew install jq      # macOS

# Redirect stderr to hide progress messages
tn list --json 2>/dev/null | jq .
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


## License

MIT License
