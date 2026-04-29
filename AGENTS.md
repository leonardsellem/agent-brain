---
title: Agent Brain Agent Instructions
---

# Agent Brain Agent Instructions

These instructions are binding for agents working in this repository. The product README is [README.md](README.md); the continuity checklist is [docs/agent-handoff.md](docs/agent-handoff.md).

## Product Boundary

Agent Brain is the implementation codebase for a git-backed package/profile manager for portable AI coding-agent capabilities.

The repository owns:

- Canonical package, profile, provenance, exclusion, and materialization-lock code.
- CLI commands for diagnosis, import, planning, apply, verify, rollback, and conflict explanation.
- Target adapters for app-specific semantics.
- Tests, docs, and agent instructions needed to keep the repo safe to evolve.

The repository does not own:

- External project-memory folders.
- Live Claude Code or Codex app homes.
- Runtime histories, caches, auth stores, generated schemas, or machine-local overrides.
- Generic dotfiles mirroring.

External memory can inform work, but product code and publishable docs belong in this repo.

## Engineering Rules

- Plan before coding.
- Use test-first development for behavior changes: write or update a failing test, run it, then implement.
- For documentation changes, add or update tests for durable documentation invariants when useful.
- Keep production filesystem, git, and process effects behind ports so tests can run against fixtures.
- Put app-specific layout knowledge in adapters and adapter tests, not in the canonical model.
- Treat Claude Code and Codex app homes as materialization targets, not the canonical Agent Brain source of truth.
- Keep commits focused and use conventional commit messages.
- Never dismiss a failing test as pre-existing. Fix it or track it as real work.

## Documentation Standards

Repo docs should be publishable without access to local project memory.

- Keep README as the high-level product entry point.
- Keep architecture, adapter, safety, and handoff docs in sync with README terminology.
- Use repo-relative links for repo files.
- Do not link to absolute local paths, private brain-vault paths, or local file URI schemes from publishable docs.
- If an external planning note is important, summarize the relevant decision into a repo doc instead of linking to the local note.
- Make safety and ownership language concrete: identify source, generated target, native-owned state, runtime/cache state, machine-local state, secret material, foreign-owned files, or unknown material.

## Safety Rules

Agent Brain must explain ownership before mutation.

- Never copy runtime state, caches, auth material, secrets, or machine-local overrides into canonical package source by default.
- Treat unknown files, unreadable paths, broken symlinks, shared mutable roots, and secret-like content as review items.
- Live target mutation requires a dry-run fingerprint, explicit confirmation, baseline snapshot, narrow adapter-backed mutation, verification, and rollback metadata.
- Do not use live app roots as test fixtures.
- Do not restructure live app roots unless the user explicitly approves the specific dry-run.

## Branch Policy

- `dev` is the GitHub default branch.
- `main` is the protected release and integration target.
- Normal integration flows by pull request from `dev` into `main`.
- Do not create or keep a `master` branch.

## Handoff Requirements

Before claiming success, run the relevant verification. The default local checks are:

```bash
npm test
npm run typecheck
```

For changes that can affect builds, also run:

```bash
npm run build
```

For dependency or release-adjacent changes, also run:

```bash
npm audit --audit-level=moderate
```

For documentation changes, run the documentation guards:

```bash
npm test -- tests/unit/readme.test.ts tests/unit/docs.test.ts
```

Final handoff should include:

- What changed.
- What verification ran and passed.
- Any verification that could not run.
- The commit hash and push status when changes were committed.
- Any pending ByteRover review tasks that require human approval.
