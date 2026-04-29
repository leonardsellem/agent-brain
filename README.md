# Agent Brain

Agent Brain is a git-backed package and profile manager for portable AI coding-agent capabilities. It helps you turn messy local agent state into a canonical model of packages, profiles, provenance, exclusions, and target materialization.

The first target is the power-user migration problem: useful Claude Code and Codex setups often accumulate skills, plugins, prompts, app config, symlinks, dotfiles, caches, generated files, and local overrides faster than anyone can explain what owns what. Agent Brain makes that state legible before it mutates anything.

## Why Agent Brain

Agent Brain is not a dotfiles mirror. Dotstate, chezmoi, stow, bare dotfiles repositories, and unmanaged home directories can all be import sources, but the durable product model is portable agent capability intent.

That distinction matters because coding-agent apps have their own semantics. A Claude Code skill, a Codex plugin, app-native config, generated schema, runtime cache, auth file, and local machine override should not be treated as equivalent text files just because they live under a home directory.

Agent Brain is built around three ideas:

- **Explain ownership first.** Every scanned artifact is classified before it can become canonical source.
- **Keep intent portable.** Packages and profiles live in the Agent Brain repo; local apps are materialization targets.
- **Make live changes reversible.** Apply flows are designed around dry-runs, fingerprints, snapshots, verification, and rollback.

## What It Manages

The canonical model is deliberately smaller than an app home directory:

- **Packages** describe portable capability source such as skills, plugins, prompts, MCP definitions, or app connector intent.
- **Profiles** choose packages and adapter targets for a working setup.
- **Provenance** records where an item came from, which adapter observed it, how it was classified, and how confident the importer was.
- **Exclusions** explain why runtime, cache, auth, secret, local-only, app-native, foreign, or unknown files are not canonical package source.
- **Materialization locks** map canonical package intent to generated target paths for a specific adapter and target root.

Claude Code and Codex are the MVP adapters. Their layouts can diverge while still sharing Agent Brain's ownership vocabulary.

## Ownership Vocabulary

Agent Brain reports diagnosis, import, verification, and conflict results using the same categories everywhere:

| Category | Meaning |
| --- | --- |
| `portable-source` | Human-authored capability source that can be adopted into the Agent Brain repo. |
| `generated-target` | Output materialized from canonical Agent Brain intent into an app target. |
| `native-owned` | App-owned configuration or state that should be managed through the app's own semantics. |
| `runtime-cache` | Cache, history, generated schema, or runtime data that should not become portable source. |
| `machine-local` | Local overrides or machine-specific paths that should not be blindly synced. |
| `secret` | Auth material or secret-like content. Excluded unless explicitly classified safe. |
| `foreign-owned` | Files owned by another tool or source of truth. |
| `unknown` | Anything that requires human review before adoption or mutation. |

## Command Surface

```bash
agent-brain doctor
agent-brain import
agent-brain plan
agent-brain apply
agent-brain verify
agent-brain rollback
agent-brain explain-conflict <path>
```

All commands support text output by default and structured output with `--json` where reports are returned.

| Command | Purpose |
| --- | --- |
| `doctor` | Scan known agent-app surfaces and explain ownership risks. |
| `import` | Convert portable source candidates into canonical package/profile output. |
| `plan` | Show proposed adoption or apply changes before writing. |
| `apply` | Materialize approved Agent Brain state into target app roots. |
| `verify` | Check generated target state and remaining risks. |
| `rollback` | Restore from snapshot metadata. |
| `explain-conflict` | Classify a conflicted path and recommend a semantic resolution. |

The current implementation is fixture-first and heavily test-driven. Live home-directory mutation should remain behind adapter-backed dry-run, confirmation, snapshot, verification, and rollback flows.

## Safety Model

Live target mutation is treated as a transaction:

1. Build a dry-run plan with every create, update, move, and symlink change.
2. Compute a fingerprint for that exact dry-run.
3. Require explicit confirmation of the fingerprint.
4. Capture a baseline snapshot before mutation.
5. Apply only the paths listed in the dry-run.
6. Verify target state.
7. Keep rollback metadata.

Runtime state, caches, auth material, secret-like content, and machine-local overrides are excluded from canonical source by default.

## Quick Start

Prerequisites:

- Node.js 20 or newer
- npm

Install dependencies and run the full local verification loop:

```bash
npm install
npm test
npm run typecheck
npm run build
```

Run the compiled CLI:

```bash
npm run build
node dist/cli.js --help
node dist/cli.js explain-conflict ~/.codex/history.jsonl
node dist/cli.js explain-conflict ~/.claude/skills/review/SKILL.md --json
```

## Development

This repository is optimized for agent-native development:

- Plan before coding.
- Write or update a failing test before behavior changes.
- Keep filesystem, git, and process effects behind ports so tests can run against fixtures.
- Treat Claude Code and Codex app homes as materialization targets, not as the canonical Agent Brain source of truth.
- Run `npm test` and `npm run typecheck` before handoff.

Useful docs:

- [Architecture](docs/architecture.md)
- [Adapter contract](docs/adapter-contract.md)
- [Safety model](docs/safety-model.md)
- [Agent handoff](docs/agent-handoff.md)
- [Agent instructions](AGENTS.md)

## Repository Status

Agent Brain is pre-1.0 and currently private while the model, adapters, and safety rails are hardened. The default development branch is `dev`; `main` is the integration target.

The package is marked private in `package.json` while release mechanics are still being hardened.

## Roadmap

Near-term:

- Deepen real Claude Code and Codex adapter fixtures.
- Expand import heuristics for dotstate, chezmoi, stow, bare dotfiles, and unmanaged home roots.
- Harden live apply confirmation, snapshot storage, verification, and rollback metadata.
- Improve conflict explanations for generated targets, runtime files, and unsafe shared roots.

Later:

- Bootstrap clean second-machine setups from an Agent Brain repo.
- Add more target adapters after Claude Code and Codex are trustworthy.
- Explore richer package publishing, sharing, and visual dependency tooling.

Out of scope for the core identity:

- Blindly mirroring full app home directories.
- Acting as a generic hosted sync service.
- Treating all coding-agent apps as if they share one universal plugin format.
- Automatically adopting secrets, auth files, caches, or runtime history.

## Security

Agent Brain is conservative around auth material and secrets. Secret-like content is classified as `secret` and excluded by default. Do not put tokens, session files, API keys, private keys, or app auth databases into canonical packages.

If you discover a security issue while this repository is private, report it through the repository owner rather than filing a public issue.

## License

Agent Brain is available under the [MIT License](LICENSE).
