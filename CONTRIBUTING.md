# Contributing to Agent Brain

Thank you for wanting to improve Agent Brain. This project is for people who care about making agent workspaces portable without turning live app folders, secrets, caches, and machine-local state into a mystery sync problem.

Agent Brain is early, but it is public and useful. Contributions are welcome when they make the CLI safer, clearer, more portable, easier to verify, or easier to explain.

## Welcome

Good contributions can be code, tests, docs, fixtures, diagrams, bug reports, safety reviews, usability notes, adapter research, or careful reproduction notes from disposable roots.

The best first step is to open an issue or draft pull request that explains:

- What pain or workflow you are improving.
- Which command, adapter, doc, or safety boundary is affected.
- Whether the change touches live filesystem behavior.
- How you verified the change.

Please keep examples synthetic. Do not paste real tokens, auth files, private histories, app databases, terminal logs with secrets, or raw personal app-root snapshots into issues, pull requests, fixtures, or docs.

## Project Promise

Agent Brain is a git-backed package and profile manager for portable AI coding-agent capabilities. It is not a generic dotfiles mirror.

That promise creates a few design constraints:

- Explain ownership before mutation.
- Version portable intent, not full app home directories.
- Keep app-specific semantics in adapters.
- Exclude runtime state, caches, auth material, secrets, and machine-local overrides by default.
- Make live changes reversible through dry-runs, fingerprints, snapshots, verification, and rollback metadata.

If a change makes Agent Brain faster but less explainable, more automatic but less reviewable, or more convenient but less reversible, it needs an explicit safety argument in the pull request.

## Good First Contributions

Strong starter contributions include:

- Improve CLI messages where a safety gate or next step is unclear.
- Add fixture coverage for Claude Code or Codex layouts using synthetic data.
- Add docs examples for `doctor`, `import`, `plan`, `apply`, `verify`, `rollback`, `bootstrap`, or `explain-conflict`.
- Improve ownership classification tests for `portable-source`, `generated-target`, `native-owned`, `runtime-cache`, `machine-local`, `secret`, `foreign-owned`, and `unknown`.
- Add adapter contract examples that preserve the canonical model.
- Tighten README, architecture, safety, release, or handoff docs when implementation behavior changes.
- Report usability friction from disposable-root or explicitly approved live-root rehearsals.

Avoid first contributions that require broad live mutation, new release automation, secret handling, or large adapter rewrites unless you have already discussed the design.

## Development Setup

Prerequisites:

- Node.js 20 or newer
- npm
- Git

Install dependencies:

```bash
npm install
```

Run the standard local checks:

```bash
npm test
npm run typecheck
npm run build
```

For documentation-only changes, also run the docs guards:

```bash
npm test -- tests/unit/readme.test.ts tests/unit/docs.test.ts
```

For dependency, packaging, or release-adjacent changes, run:

```bash
npm audit --audit-level=moderate
```

Run the compiled CLI against the synthetic fixture before changing command behavior:

```bash
npm run build
node dist/cli.js --help
node dist/cli.js doctor --fixture tests/fixtures/e2e-persona/scannable.json
node dist/cli.js plan --fixture tests/fixtures/e2e-persona/scannable.json --json
```

Use `tmp/`, disposable directories, or the synthetic fixture for experiments. Do not use live `.claude`, `.codex`, `.dotstate`, or other app roots as test fixtures.

## Development Workflow

Plan before coding. For behavior changes, write or update a failing test first, run it, then implement the smallest change that makes the test pass.

Keep changes focused:

- One feature, fix, or documentation theme per pull request.
- Prefer small ports and adapters over direct filesystem, git, or process effects.
- Keep adapter-specific layout knowledge in adapter code and adapter tests.
- Keep publishable docs free of absolute local paths and private project-memory links.
- Use conventional commit messages when possible, such as `feat:`, `fix:`, `docs:`, `test:`, or `chore:`.

When updating docs, keep these surfaces aligned:

- [README](README.md) for the public product entry point.
- [Architecture](docs/architecture.md) for system boundaries.
- [Adapter contract](docs/adapter-contract.md) for app-specific behavior.
- [Safety model](docs/safety-model.md) for mutation rules.
- [Agent instructions](AGENTS.md) for repo-local engineering guardrails.
- [Agent handoff](docs/agent-handoff.md) for continuity.

## Safety Rules

Agent Brain must fail closed around live state.

Do not add behavior that:

- Copies full app homes into canonical packages.
- Adopts secrets, tokens, auth stores, runtime histories, caches, or generated schemas by default.
- Mutates live roots without explicit roots, a dry-run fingerprint, confirmation, a baseline snapshot, verification, and rollback metadata.
- Treats unknown files as safe portable source.
- Silently overwrites foreign-owned or native-owned files.
- Uses a real user app root as a fixture.
- Publishes raw live E2E evidence that could reveal private paths, secrets, histories, or local machine assumptions.

If you touch live apply, verification, rollback, bootstrap, path safety, source detection, or secret classification, include tests that prove the failure mode as well as the happy path.

## Pull Request Checklist

Before asking for review, make sure the pull request includes:

- A clear description of the user-facing change.
- Links to related issues or design notes, when available.
- Tests for behavior changes, including negative safety cases when relevant.
- Updated docs for changed commands, safety gates, adapters, or release behavior.
- Verification output for the relevant commands.
- A note about any skipped verification and why it could not run.
- Screenshots or diagrams only when they help explain a CLI, docs, or workflow change, and only if they contain synthetic data.

Recommended verification:

```bash
npm test
npm run typecheck
npm run build
```

Add `npm audit --audit-level=moderate` for dependency or release-adjacent changes.

## Release and Security Boundaries

Normal pull requests should not publish to npm. Version preparation and npm publication are deliberate release steps handled by release automation and maintainer approval.

Do not add npm tokens, GitHub tokens, API keys, session files, private keys, or auth databases to the repository. Prefer trusted publishing and short-lived automation credentials where release work is needed.

If you find a security issue, do not open a public proof-of-exploit issue with secrets or live paths. Contact the maintainer privately through the repository owner channel, then coordinate a sanitized advisory or fix.

Thank you for helping make agent setups more legible, portable, and safe.
