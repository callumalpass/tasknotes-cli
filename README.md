# TaskNotes CLI

A command-line interface for TaskNotes with interactive mode and real-time NLP preview.

## Features

-  **Quick Task Creation**: Create tasks with natural language parsing
-  **Interactive Mode**: Real-time preview as you type
-  **Task Management**: List, search, update, and complete tasks
-  **Advanced Filtering**: Complex query expressions with logical operators
-  **Smart Parsing**: Extract dates, priorities, tags, contexts, and more
-  **Time Tracking**: Start/stop timers, view time logs and sessions
-  **Pomodoro Integration**: Full pomodoro timer with stats and task integration
-  **Project Management**: Create, view, and manage projects with stats
-  **Recurring Tasks**: Create and manage recurring tasks with patterns
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

# Update task properties
tn update "TaskNotes/Tasks/Buy groceries.md" --status completed --priority low
tn update "task-123" --add-tags "urgent,important" --due "2025-08-20"

# Task management
tn toggle "TaskNotes/Tasks/Buy groceries.md"  # Toggle task status
tn archive "TaskNotes/Tasks/Buy groceries.md" # Archive/unarchive task
tn delete "TaskNotes/Tasks/Buy groceries.md" --force # Delete task permanently

# Complete recurring task instances  
tn recurring-complete "recurring-task-123" "2025-08-13"

# Search tasks
tn search "groceries"

# Time tracking
tn timer start --task "TaskNotes/Tasks/Buy groceries.md"
tn timer status
tn timer stop
tn timer log --date 2025-08-13 --limit 10

# Pomodoro timer
tn pomodoro start --task "TaskNotes/Tasks/Buy groceries.md" --duration 25
tn pomodoro status  # Shows enhanced status with daily progress
tn pomodoro pause
tn pomodoro resume
tn pomodoro stop
tn pomodoro stats   # Daily statistics
tn pomodoro sessions --limit 10  # View session history

# Project management
tn projects list
tn projects show "Website Redesign"
tn projects create "New Project" --description "My new project"
tn projects stats "Website Redesign" --period month

# Recurring tasks
tn recurring create --title "Weekly standup" --pattern "every monday" --time "09:00"
tn recurring list
tn recurring show --id "recurring-123"
tn recurring instances --id "recurring-123" --limit 10
tn recurring disable --id "recurring-123"
tn recurring enable --id "recurring-123"

# Task management  
tn delete "TaskNotes/Tasks/Buy groceries.md" --force  # Delete task
tn toggle "TaskNotes/Tasks/Buy groceries.md"          # Toggle status
tn archive "TaskNotes/Tasks/Buy groceries.md"         # Archive/unarchive

# Utility commands
tn filter-options     # Show available filter options
tn api-docs           # Show TaskNotes API documentation
tn api-docs --ui      # Get Swagger UI URL

# Configuration
tn config
tn config --set host=192.168.1.100
tn config --list

# Task statistics and insights
tn stats
tn stats --json

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

## Time Tracking & Productivity

### Time Tracking

Track time spent on tasks with built-in timer functionality:

```bash
# Start timer for a specific task
tn timer start --task "TaskNotes/Tasks/Fix bug #123.md"

# Check current timer status
tn timer status

# Stop the running timer
tn timer stop

# View time log for today
tn timer log

# View time log for specific date
tn timer log --date 2025-08-13

# View time log for specific task
tn timer log --task "TaskNotes/Tasks/Fix bug #123.md" --limit 5
```

### Pomodoro Timer

Integrated pomodoro timer with task tracking and statistics:

```bash
# Start 25-minute pomodoro session
tn pomodoro start --task "TaskNotes/Tasks/Write documentation.md"

# Start custom duration pomodoro
tn pomodoro start --task "task-123" --duration 45

# Check pomodoro status with progress
tn pomodoro status

# Pause/resume current session
tn pomodoro pause
tn pomodoro resume

# Stop current session
tn pomodoro stop

# View pomodoro session history
tn pomodoro sessions
tn pomodoro sessions --date 2025-08-13
tn pomodoro sessions --limit 5

# View daily pomodoro stats
tn pomodoro stats

# View stats for specific date
tn pomodoro stats --date 2025-08-13
```

## Project Management

Organize tasks into projects with comprehensive project views:

```bash
# List all projects
tn projects list

# View project details with recent tasks
tn projects show "Website Redesign"
tn projects show "Website Redesign" --limit 20

# Create new project
tn projects create "Mobile App" --description "iOS and Android development"
tn projects create "Mobile App" --folder "Projects" --template "agile"

# View project statistics
tn projects stats "Website Redesign"
tn projects stats "Website Redesign" --period week
tn projects stats "Website Redesign" --period month

# JSON output for automation
tn projects list --json
tn projects show "Website Redesign" --json
```

## Recurring Tasks

Create and manage recurring tasks with flexible patterns:

```bash
# Create daily recurring task
tn recurring create --title "Daily standup" --pattern "daily" --time "09:00"

# Create weekly recurring task
tn recurring create --title "Team meeting" --pattern "weekly" --time "14:00"
tn recurring create --title "Code review" --pattern "every friday" --time "16:00"

# Create complex patterns
tn recurring create --title "Monthly report" --pattern "every first monday" --time "10:00"

# List all recurring tasks
tn recurring list

# List only active recurring tasks
tn recurring list --active true

# View recurring task details
tn recurring show --id "recurring-123"

# View recurring task instances
tn recurring instances --id "recurring-123"
tn recurring instances --id "recurring-123" --status completed
tn recurring instances --id "recurring-123" --from 2025-08-01 --to 2025-08-31

# Update recurring task
tn recurring update --id "recurring-123" --pattern "every tuesday" --time "10:30"
tn recurring update --id "recurring-123" --title "Updated title" --priority high

# Disable/enable recurring tasks
tn recurring disable --id "recurring-123"
tn recurring enable --id "recurring-123"

# JSON output
tn recurring list --json
tn recurring show --id "recurring-123" --json
```

### Recurring Pattern Examples

Supported recurring patterns:

- **Daily**: `daily`, `every day`
- **Weekly**: `weekly`, `every week`, `every monday`, `every tue`, `every friday`
- **Monthly**: `monthly`, `every month`, `every first monday`, `every last friday`
- **Custom**: `every 2 days`, `every 3 weeks`, `every 2 months`

## Task Updates

Update task properties without editing files:

```bash
# Update task status
tn update "task-123" --status "in-progress"
tn update "TaskNotes/Tasks/Bug fix.md" --status completed

# Update priority and due date
tn update "task-123" --priority urgent --due "2025-08-20"

# Update multiple properties
tn update "task-123" --title "New title" --estimate 120 --priority high

# Add/remove tags
tn update "task-123" --add-tags "urgent,bug,frontend"
tn update "task-123" --remove-tags "low-priority"

# Add/remove contexts and projects
tn update "task-123" --add-contexts "office,meeting"
tn update "task-123" --add-projects "Website Redesign"
tn update "task-123" --remove-contexts "home"
```

## Statistics and Insights

Get comprehensive statistics about your task management:

```bash
# View task statistics with insights
tn stats

# Get JSON output for automation
tn stats --json
```

The stats command provides:

- **Task counts** - Total, completed, active, overdue, archived
- **Completion rate** - Percentage of tasks completed
- **Time tracking insights** - How many tasks have time data
- **Visual progress bars** - Easy-to-read completion progress
- **Productivity insights** - Suggestions based on your task patterns
- **Distribution breakdown** - How tasks are distributed across states

Example output:
```
📊 Task Statistics
────────────────────────────────────────
Total tasks: 299
Completed: 77
Active: 216
Overdue: 40
Archived: 11
With time tracking: 18
Completion rate: 27%
Progress: [█████░░░░░░░░░░░░░░░] 27%

Task Distribution:
● Active: 75% (216 tasks)
● Completed: 27% (77 tasks)
● Overdue: 14% (40 tasks)
● Archived: 11 tasks (not included in percentages)

⚠️  Insights:
• High number of overdue tasks - try breaking them into smaller tasks

⏱️  Time Tracking:
• 6% of tasks have time tracking data
• Consider using time tracking for better productivity insights
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
