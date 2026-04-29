---
title: Agent Brain Agent Instructions
---

# Agent Brain Agent Instructions

This repository is the implementation codebase for Agent Brain. The GBrain folder at `/Users/leonardsellem/Library/Mobile Documents/iCloud~md~obsidian/Documents/gbrain-brain/projects/agent-brain` is project memory and documentation only; do not put product code there.

## Working Rules

- Plan before coding.
- Use test-first development for behavior changes: write or update a failing test, run it, then implement.
- Keep production filesystem, git, and process effects behind ports so tests can run against fixtures.
- Treat Claude Code and Codex app homes as materialization targets, not the canonical Agent Brain source of truth.
- Never copy runtime state, caches, auth material, secrets, or machine-local overrides into canonical package source by default.
- Run relevant tests before claiming success. A failing test is either fixed or tracked as real work.
- Keep commits focused and use conventional commit messages.

## Repository Boundary

- Codebase: `/Users/leonardsellem/Dev/agent-brain`
- Private repo: `https://github.com/leonardsellem/agent-brain`
- Project memory: `gbrain-brain/projects/agent-brain/`

## Branch Policy

- `dev` is the GitHub default branch.
- `main` is the protected release and integration target.
- Normal integration flows by pull request from `dev` into `main`.
- Do not create or keep a `master` branch.

## Verification

Before handoff, run:

```bash
npm test
npm run typecheck
```

When live target mutation is implemented, verify dry-run fingerprint, snapshot creation, apply, verify, and rollback paths before using real app roots.
