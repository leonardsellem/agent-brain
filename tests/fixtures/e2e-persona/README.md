---
title: E2E Persona Fixture
---

# E2E Persona Fixture

This fixture models a messy but synthetic Claude Code and Codex setup for release rehearsal. It must never contain copied live app state, real secrets, auth stores, account identifiers, or private machine-local overrides.

## Fixture Map

- `claude-code/skills/review/SKILL.md`: authored Claude Code capability that should classify as portable source.
- `codex/skills/review/SKILL.md`: parallel authored Codex capability with the same package-like name, used to expose conflict and semantic parity behavior.
- `codex/cache/history.jsonl`: runtime cache/history example that should be excluded from canonical package source.
- `codex/auth.json`: harmless fake auth-shaped content that should be treated as secret material.
- `claude-code/projects/project-a/local.json`: machine-local override example that should not become portable source.
- `import-sources/dotstate/skills/review/SKILL.md`: synthetic dotstate-style source root for import-source reasoning.
- `target-roots/`: disposable target-root examples for safety and rollback reasoning, not real app homes.
- `scannable.json`: structured public CLI fixture used by `--fixture` in the developer-preview workflow.

The fixture intentionally favors small text files and explicit documentation over hidden filesystem tricks. Broken symlinks, unreadable paths, and shared physical roots are represented by scannable fixture metadata so the public CLI can exercise ownership classification without scanning live app homes.
