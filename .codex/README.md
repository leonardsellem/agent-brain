# Codex Project Notes

Codex should follow the root [AGENTS.md](../AGENTS.md) file for this codebase.

Project-local expectations:

- Treat `/Users/leonardsellem/Dev/agent-brain` as the implementation repo.
- Treat the GBrain `projects/agent-brain/` folder as durable memory and planning context, not product code.
- Prefer fixture-backed tests over live home-directory reads.
- Keep live Claude Code and Codex app target changes behind dry-run, confirmation, snapshot, verify, and rollback.
