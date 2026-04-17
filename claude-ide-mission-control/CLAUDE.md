# Claude IDE — Mission Control

Patched Electron wrapper for Claude Code with a built-in dashboard.

## Key Commands

```bash
bash install.sh          # Patch Claude IDE with Mission Control
open -a "Claude IDE"     # Launch
```

## What It Does

- **Dashboard tab** (Cmd+D): Calendar, to-dos, Slack pulse, news, session costs
- **Terminal tabs** (Cmd+T): Full xterm.js terminals with Claude Code sessions
- **Keyboard shortcuts**: Cmd+D (dashboard), Cmd+T (new terminal)
- **Drag-and-drop**: Drop files onto terminals to paste paths

## Setup

1. Install the official Claude Code desktop app (Claude IDE)
2. Clone this repo
3. Copy `config.example.json` to `~/.config/claude-ide-mc/config.json` and customize
4. Run `bash install.sh`

## Configuration

Edit `~/.config/claude-ide-mc/config.json`:
- `user.name` — Your name for Slack drafts
- `slack.pulseChannels` — Channel IDs to monitor
- `slack.quickRecipients` — People/channels for quick messaging

## Skills

Add your own skills to `.claude/skills/` — see `explain-code/` for an example.
