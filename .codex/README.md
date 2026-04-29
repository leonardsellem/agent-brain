# Codex Project Notes

Codex should follow the root [AGENTS.md](../AGENTS.md) file for this codebase.

Project-local expectations:

- Treat this checkout as the implementation repo.
- Treat external project-memory systems as planning context, not product code.
- Prefer fixture-backed tests over live home-directory reads.
- Keep live Claude Code and Codex app target changes behind dry-run, confirmation, snapshot, verify, and rollback.
