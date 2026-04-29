# Agent Brain

Agent Brain is a package/profile manager for portable AI coding-agent capabilities. It turns messy local agent-app state into a canonical, git-backed model of packages, profiles, provenance, exclusions, and target materialization.

It is not a generic dotfiles mirror. Claude Code, Codex, dotstate, chezmoi, stow, bare dotfiles repos, and unmanaged home directories are inputs or materialization targets; Agent Brain owns portable intent.

## Repository

- Private GitHub repo: `https://github.com/leonardsellem/agent-brain`
- Default branch: `dev`
- Integration branch: `main`

## MVP Workflow

```bash
agent-brain doctor
agent-brain import
agent-brain plan
agent-brain apply
agent-brain verify
agent-brain rollback
agent-brain explain-conflict
```

The first implementation focuses on diagnosis, import, dry-run, snapshot, apply, verify, rollback, and conflict explanation for Claude Code and Codex targets.
