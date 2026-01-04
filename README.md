# TaskNotes CLI

Command-line interface for the [TaskNotes](https://github.com/callumalpass/tasknotes) Obsidian plugin. Requires TaskNotes with the HTTP API enabled.

## Installation

```bash
git clone https://github.com/callumalpass/tasknotes-cli.git
cd tasknotes-cli
npm install
npm link  # Creates global 'tn' command
```

## Setup

```bash
tn config
```

This will auto-discover the TaskNotes API or prompt for host/port.

## Commands

### Tasks

```bash
# Create task (natural language parsed)
tn "Review PR #123 tomorrow high priority @work"

# Interactive mode
tn

# List tasks
tn list
tn list --today
tn list --overdue
tn list --completed
tn list --filter "priority:urgent AND tags:work"
tn list --json

# Task operations
tn complete <taskId>
tn toggle <taskId>
tn archive <taskId>
tn delete <taskId> --force
tn update <taskId> --status completed --priority high --due 2025-08-20

# Update tags/contexts/projects
tn update <taskId> --add-tags "urgent,bug" --remove-tags "low-priority"
tn update <taskId> --add-contexts "office" --add-projects "Website"

# Search
tn search "groceries"
```

### Time Tracking

```bash
tn timer start --task <taskId>
tn timer status
tn timer stop
tn timer log --date 2025-08-13
```

### Pomodoro

```bash
tn pomodoro start --task <taskId> --duration 25
tn pomodoro status
tn pomodoro pause
tn pomodoro resume
tn pomodoro stop
tn pomodoro stats
tn pomodoro sessions --limit 10
```

### Projects

```bash
tn projects list
tn projects show "Website Redesign"
tn projects create "New Project" --description "Description"
tn projects stats "Website Redesign" --period month
```

### Calendars

```bash
tn calendars list
tn calendars google
tn calendars microsoft
tn calendars subscriptions
tn calendars events
tn calendars events --start 2026-01-01 --end 2026-01-31
```

### Recurring Tasks

```bash
tn recurring create --title "Weekly standup" --pattern "every monday" --time "09:00"
tn recurring list
tn recurring show --id <id>
tn recurring instances --id <id>
tn recurring disable --id <id>
tn recurring enable --id <id>
tn recurring-complete <taskId> <instanceDate>
```

### Other

```bash
tn stats
tn filter-options
tn filter-help
tn api-docs
tn config --list
tn config --set host=192.168.1.100
```

## Filtering

```bash
# Properties
tn list --filter "priority:urgent"
tn list --filter "status:in-progress"
tn list --filter "tags:project"
tn list --filter "due:before:2025-08-20"

# Operators
tn list --filter "priority:urgent AND tags:work"
tn list --filter "priority:urgent OR priority:high"
tn list --filter "(priority:urgent OR priority:high) AND tags:project"
```

Properties: `title`, `status`, `priority`, `tags`, `contexts`, `projects`, `due`, `scheduled`, `completed`, `created`, `modified`, `archived`, `estimate`

Operators: `is`, `is-not`, `contains`, `does-not-contain`, `before`, `after`, `empty`, `not-empty`, `greater-than`, `less-than`

Run `tn filter-help` for full syntax.

## FZF Integration

Requires [fzf](https://github.com/junegunn/fzf) installed.

```bash
tn-fzf
tn-fzf "priority:urgent"
tn-fzf --today --limit 50
```

Keybindings:
- `Enter` - Open in Obsidian
- `Ctrl-E` - Open in $EDITOR
- `Alt-A` - Add new task
- `Ctrl-R` - Refresh

## JSON Output

All commands support `--json` for scripting:

```bash
tn list --filter "priority:urgent" --json | jq -r '.data.tasks[].title'
tn list --json | jq -r '.data.vault.path as $vault | .data.tasks[] | $vault + "/" + .path'
```

## Natural Language Parsing

The `tn` command parses:

- Dates: `tomorrow`, `friday`, `next week`, `2024-12-25`
- Priority: `high priority`, `urgent`, `!!!`
- Tags: `#personal`, `#work`
- Contexts: `@home`, `@office`
- Projects: `+website`
- Estimates: `2h`, `30min`
- Recurrence: `daily`, `every monday`

```bash
tn "Fix bug #456 due friday high priority @backend estimate 2h"
```

## Configuration

Config stored at `~/.tasknotes-cli/config.json`:

```json
{
  "host": "localhost",
  "port": 8080,
  "authToken": null,
  "maxResults": 20
}
```

## Requirements

- Node.js 14+
- TaskNotes plugin with API enabled
- Optional: `fzf`, `jq`, `bat`

## License

MIT
