# Agent Handoff

This document is the continuity layer for humans and coding agents working in the Agent Brain repo. The README explains the product; this file explains how to enter, change, verify, and hand off the codebase without losing the safety posture.

Start with [AGENTS.md](../AGENTS.md) for binding repo instructions, then use this file as the working checklist.

## Current Posture

Agent Brain is a pre-1.0 TypeScript CLI. The current release surface includes guided `agent-brain setup`, a fixture-backed rehearsal path, and explicit-root live flows for disposable or user-approved targets. Setup discovers `~/.claude`, `~/.codex`, and `~/.agents` read-only, writes the canonical repo only after import confirmation, and rewrites live targets only after backup evidence plus exact dry-run fingerprint confirmation. Real tracked personal roots require the stricter [live personal npm E2E protocol](live-personal-npm-e2e-protocol.md), where Ring 1 stays non-mutating and Ring 2 requires fresh approval, a reviewed fingerprint, snapshot evidence, verification, rollback or approved recovery, and post-test diff inspection. Claude Code and Codex are materialization targets, while the Agent Brain repo owns portable package/profile intent.

Important boundaries:

- Do not treat local app homes as canonical source.
- Do not copy secrets, auth material, runtime caches, histories, or machine-local overrides into packages by default.
- Do not link published docs to local project-memory paths outside the repo.
- Keep app-specific layout knowledge in adapters and tests.
- Keep rehearsal import writes under an explicit destination such as `tmp/agent-brain-preview`; root `tmp/` is gitignored for local rehearsal output.
- Keep branch work on `dev` unless the user explicitly asks for a different integration flow.

## Start of Session

At the start of a coding or documentation task:

1. Check `git status --short` and current branch.
2. Read the nearest [AGENTS.md](../AGENTS.md).
3. Query ByteRover for broad subsystem context and narrow file or symbol context.
4. Read the relevant source, tests, and docs before editing.
5. Make a short plan before changing files.

If a task is driven by external project memory, summarize the relevant facts into repo-local changes. Do not add absolute links to local brain or planning folders.

## Development Loop

Use the smallest loop that makes the requested behavior real:

1. Add or update a failing test for behavior or documentation invariants.
2. Run the focused test and confirm it fails for the expected reason.
3. Make the smallest coherent implementation or documentation change.
4. Run the focused test until green.
5. Run broader verification before handoff.

For documentation work, tests should guard durable quality when possible: required sections, portable links, command names, safety language, or examples that should not regress.

## Verification and Handoff

Default verification:

```bash
npm test
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

Documentation changes should also run the documentation guards:

```bash
npm test -- tests/unit/readme.test.ts tests/unit/docs.test.ts
```

Release-surface changes should also run:

```bash
npm test -- tests/integration/release-cli.test.ts
npm run build
node dist/cli.js --help
```

npm distribution or release-workflow changes should also run:

```bash
npm test -- tests/unit/package-bin.test.ts tests/unit/package-metadata.test.ts tests/unit/package-pack-smoke.test.ts tests/unit/release-workflows.test.ts
npm run pack:smoke
```

Before final handoff:

- Confirm `git status --short`.
- Commit focused changes with a conventional commit message when requested or when completing a repo task.
- Push the active branch when the task is meant to update the open PR.
- Mention any skipped verification and why.
- Mention pending ByteRover review tasks without approving high-impact changes unless the user explicitly asks.

## Durable Memory

Use ByteRover when a meaningful implementation, architecture, safety, workflow, or documentation standard changes. Good entries include the behavior, constraints, failure modes, and the most relevant repo files.

Use external project memory only as input. Publishable repo docs should link to repo files, stable web URLs, or anchors, not local absolute paths.

When a learning affects future agents, prefer one of these destinations:

| Learning type | Destination |
| --- | --- |
| Binding repo rule | [AGENTS.md](../AGENTS.md) |
| Product overview | [README.md](../README.md) |
| System structure | [Architecture](architecture.md) |
| Target app semantics | [Adapter contract](adapter-contract.md) |
| Live mutation policy | [Safety model](safety-model.md) |
| Session workflow | This handoff file |

## Quick Orientation

- CLI entry point: [src/cli.ts](../src/cli.ts)
- Commands: [src/commands](../src/commands)
- Core model: [src/core/model.ts](../src/core/model.ts)
- Classification: [src/core/classification.ts](../src/core/classification.ts)
- Adapters: [src/adapters](../src/adapters)
- Apply and rollback: [src/apply](../src/apply)
- Tests: [tests](../tests)
