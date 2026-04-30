# Agent Brain

[![npm version](https://img.shields.io/npm/v/@leonardsellem%2Fagent-brain?label=npm)](https://www.npmjs.com/package/@leonardsellem/agent-brain)

Agent Brain is a git-backed package and profile manager for AI coding-agent setups.

It is for the moment when your Claude Code and Codex setup works, but you can no longer explain it. Skills, plugins, prompts, MCP config, hooks, profiles, app settings, generated files, symlinks, dotfiles, caches, auth state, and local overrides all end up living near each other. Dotfiles can move those paths around; they cannot tell you what is authored source, what the app owns, what is generated, what is local-only, or what should never be synced.

Agent Brain turns that pile of agent app state into portable intent: packages, profiles, provenance, exclusions, adapter targets, and rollback-aware materialization. The core promise is simple: explain the setup first, make it portable second, mutate it only after safety gates.

![Agent Brain turns messy live agent folders into portable intent](https://raw.githubusercontent.com/leonardsellem/agent-brain/dev/docs/diagrams/agent-brain-usp.svg)

## Why Agent Brain

AI coding agents are becoming programmable work environments. A serious setup is no longer one config file; it is a mix of human-authored capabilities, app-native state, generated target output, runtime history, auth material, machine-local assumptions, and foreign tool ownership.

That creates three recurring pains:

- **You cannot see ownership.** A generic merge tool can show text conflicts, but it cannot say whether a conflicted file is source, generated output, cache, auth state, or unsafe shared-root fallout.
- **You cannot safely move machines.** Copying full `.claude` and `.codex` folders can move secrets, caches, generated files, stale symlinks, and machine-local assumptions along with the useful parts.
- **You cannot trust automation yet.** An agent can help manage agent tooling only if it has a semantic model and a fail-closed apply path before it touches live roots.

Agent Brain is not a dotfiles mirror. Dotstate, chezmoi, stow, bare dotfiles repositories, and unmanaged home directories can all be import sources, but the durable product model is portable agent capability intent.

That distinction matters because coding-agent apps have their own semantics. A Claude Code skill, a Codex plugin, app-native config, generated schema, runtime cache, auth file, and local machine override should not be treated as equivalent text files just because they live under a home directory.

Agent Brain is built around three ideas:

- **Explain ownership first.** Every scanned artifact is classified before it can become canonical source.
- **Version intent, not app folders.** Packages and profiles live in the Agent Brain repo; local apps are materialization targets.
- **Make live changes reversible.** Apply flows are designed around dry-runs, fingerprints, snapshots, verification, and rollback.

## What It Manages

The canonical model is deliberately smaller than an app home directory:

- **Packages** describe portable capability source such as skills, plugins, prompts, MCP definitions, or app connector intent.
- **Profiles** choose packages and adapter targets for a working setup.
- **Provenance** records where an item came from, which adapter observed it, how it was classified, and how confident the importer was.
- **Exclusions** explain why runtime, cache, auth, secret, local-only, app-native, foreign, or unknown files are not canonical package source.
- **Materialization locks** map canonical package intent to generated target paths for a specific adapter and target root.

Claude Code and Codex are the MVP adapters. Their layouts can diverge while still sharing Agent Brain's ownership vocabulary.

![Agent Brain canonical model and adapter boundary](https://raw.githubusercontent.com/leonardsellem/agent-brain/dev/docs/diagrams/agent-brain-canonical-model.svg)

Open the [standalone diagram gallery](https://github.com/leonardsellem/agent-brain/blob/dev/docs/diagrams/agent-brain-diagrams.html) for larger versions of the README diagrams.

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
agent-brain setup
agent-brain doctor
agent-brain import
agent-brain plan
agent-brain apply
agent-brain verify
agent-brain rollback
agent-brain bootstrap
agent-brain explain-conflict <path>
```

All commands support text output by default and structured output with `--json` where reports are returned.

| Command | Purpose |
| --- | --- |
| `setup` | Guided first-run discovery, import confirmation, and optional safe local rewrite. |
| `doctor` | Scan known agent-app surfaces and explain ownership risks. |
| `import` | Convert portable source candidates into canonical package/profile output. |
| `plan` | Show proposed adoption or apply changes before writing. |
| `apply` | Materialize approved Agent Brain state into target app roots. |
| `verify` | Check generated target state and remaining risks. |
| `rollback` | Restore from snapshot metadata. |
| `bootstrap` | Materialize a second-machine target from an Agent Brain repo. |
| `explain-conflict` | Classify a conflicted path and recommend a semantic resolution. |

The current implementation supports guided setup, a fixture-backed rehearsal path, and explicit live paths for disposable or user-approved roots. Live mutation requires adapter/profile selection, a dry-run fingerprint, a baseline snapshot, a materialization lock, verification, rollback evidence, and generated-owned paths before a target is considered healthy.

![Agent Brain command journey for diagnosis, import, planning, apply, verification, rollback, bootstrap, and conflict explanation](https://raw.githubusercontent.com/leonardsellem/agent-brain/dev/docs/diagrams/agent-brain-command-journey.svg)

## Safety Model

Live target mutation is treated as a transaction:

1. Start from explicit roots supplied on the command line.
2. Build a dry-run plan with every create, update, move, and symlink change.
3. Compute a dry-run fingerprint for that exact operation set.
4. Require explicit confirmation of the fingerprint.
5. Capture a baseline snapshot before mutation.
6. Apply only the paths listed in the dry-run.
7. Write a materialization lock.
8. Verify target state.
9. Keep rollback metadata.

![Agent Brain guarded live apply safety model](https://raw.githubusercontent.com/leonardsellem/agent-brain/dev/docs/diagrams/agent-brain-live-safety.svg)

Runtime state, caches, auth material, secret-like content, and machine-local overrides are excluded from canonical source by default.

## Quick Start

Prerequisites:

- Node.js 20 or newer
- npm

Install the CLI from npm and confirm that the shell is running the installed version:

```bash
npm install -g @leonardsellem/agent-brain
agent-brain --version
agent-brain --help
```

If `agent-brain --version` does not print the new version after an install, force npm to refresh the global package:

```bash
npm install -g @leonardsellem/agent-brain@latest --prefer-online
```

The important mental model: start with `agent-brain setup` unless you already know the exact expert flags you need.

Run against a disposable or explicitly approved setup first. Setup discovery and summaries are read-only, import writes only the canonical Agent Brain repo, and live rewrite can mutate a selected target only after backup evidence and exact dry-run fingerprint confirmation.

`agent-brain setup` can run with no arguments. It discovers `~/.claude`, `~/.codex`, and `~/.agents` read-only, follows symlinks for evidence, summarizes portable candidates and exclusions, and stops before writing.

Start with a non-mutating setup preview:

```bash
agent-brain setup
```

That command should print visible roots, backing paths when symlinks are involved, portable candidates, default exclusions such as auth/cache/runtime material, and unknown review items. Findings are not automatic changes; they are labels that explain ownership, portability, caches, secrets, unknown files, or roots that need review.

To write the canonical Agent Brain repo after reviewing the summary, confirm the import. By default, setup uses `~/.agent-brain`; pass `--repo <path>` to choose another destination.

```bash
agent-brain setup --confirm-import
```

`agent-brain setup --confirm-import` writes the canonical Agent Brain repo after you review the summary. It does not rewrite `~/.claude`, `~/.codex`, or `~/.agents` unless you also select a target root and confirm the exact dry-run fingerprint.

For the first full workflow, use disposable roots. This creates a tiny Claude Code-like source root, previews guided setup against a disposable HOME, imports it into an Agent Brain repo, dry-runs materialization into a separate target, confirms that exact dry-run, verifies the result, rolls it back, and bootstraps another target from the canonical repo:

```bash
AB_DEMO="$(pwd)/tmp/agent-brain-demo"
rm -rf "$AB_DEMO"
mkdir -p "$AB_DEMO/home/.claude/skills/review" "$AB_DEMO/home/.codex" "$AB_DEMO/live-target"
printf '# Review\n\nPortable disposable skill.\n' > "$AB_DEMO/home/.claude/skills/review/SKILL.md"

# Preview guided setup. This is read-only.
HOME="$AB_DEMO/home" agent-brain setup --repo "$AB_DEMO/agent-brain-live" --json

# Confirm only the canonical import after reviewing the summary.
HOME="$AB_DEMO/home" agent-brain setup --repo "$AB_DEMO/agent-brain-live" --confirm-import --json

# Dry-run setup's optional local rewrite. This creates backup evidence and does not mutate yet.
DRY_RUN_JSON=$(HOME="$AB_DEMO/home" agent-brain setup --repo "$AB_DEMO/agent-brain-live" --confirm-import --target-root "$AB_DEMO/live-target" --adapter claude-code --profile profile.default --json)
printf '%s\n' "$DRY_RUN_JSON"
FINGERPRINT=$(printf '%s' "$DRY_RUN_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).findings.find(f=>f.id==="apply.dry-run").provenance.fingerprint))')

# Confirm only the exact dry-run fingerprint you just reviewed. Setup verifies after mutation.
APPLY_JSON=$(HOME="$AB_DEMO/home" agent-brain setup --repo "$AB_DEMO/agent-brain-live" --confirm-import --target-root "$AB_DEMO/live-target" --adapter claude-code --profile profile.default --confirm-fingerprint "$FINGERPRINT" --json)
printf '%s\n' "$APPLY_JSON"
SNAPSHOT=$(printf '%s' "$APPLY_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).findings.find(f=>f.id==="apply.snapshot-created").provenance.snapshotPath))')

# Verify, rollback, and prove a second target can be bootstrapped from canonical intent.
agent-brain verify --repo "$AB_DEMO/agent-brain-live" --target-root "$AB_DEMO/live-target" --adapter claude-code --json
agent-brain rollback --snapshot "$SNAPSHOT" --target-root "$AB_DEMO/live-target" --json
agent-brain bootstrap --repo "$AB_DEMO/agent-brain-live" --target-root "$AB_DEMO/live-target-b" --adapter claude-code --profile profile.default --json
```

When you are ready to inspect real local state, keep the first pass non-mutating:

```bash
agent-brain setup
```

Only import or rewrite real roots after reviewing the setup summary. Use `--repo` to choose where the canonical Agent Brain repo output should be written:

```bash
agent-brain setup --repo ~/agent-brain-live --confirm-import --json
```

### Expert commands

Use expert commands when automation or a manual recovery path needs exact inputs:

| Command | What it expects |
| --- | --- |
| `agent-brain doctor` | Can run with no arguments. It does a read-only diagnosis of standard local Claude Code, Codex, and agents roots it can discover. |
| `agent-brain doctor --claude-root <path>` | Diagnoses an explicit root instead of relying on default discovery. Add `--codex-root` or repeated `--source-root` values when those are part of the setup you want to inspect. |
| `agent-brain plan` | Previews what would be adopted from an input source. It needs `--claude-root`, `--codex-root`, `--source-root`, or `--fixture`. It does not write an Agent Brain repo. |
| `agent-brain import` | Converts portable candidates from an input source into canonical Agent Brain repo files. It needs an input source plus `--repo <path>` because that is where it writes the repo output. |
| `agent-brain apply` | Reads an Agent Brain repo and target root, then prints a dry-run fingerprint first. It mutates only when you rerun it with the exact `--confirm-fingerprint` value. |
| `agent-brain verify` | Checks a target root against an Agent Brain repo and adapter. |
| `agent-brain rollback` | Restores a target root from snapshot metadata created by a confirmed apply. |
| `agent-brain bootstrap` | Builds another target root from the canonical Agent Brain repo. |

For real tracked `.codex`, `.claude`, and `.dotstate` folders, use the [personal live npm E2E protocol](https://github.com/leonardsellem/agent-brain/blob/dev/docs/live-personal-npm-e2e-protocol.md) before any mutation. It keeps the npm-installed, Computer Use-visible pass non-mutating until a fresh Ring 2 approval names the exact dry-run fingerprint and recovery evidence.

Live mutation is intentionally slower than diagnosis. The same safety gates apply to real app roots and disposable roots: explicit roots, dry-run fingerprint, baseline snapshot, materialization lock, verify, rollback, and bootstrap from canonical intent rather than copying full app homes.

### Contributor Setup

Install dependencies and run the full local verification loop from a source checkout:

```bash
npm install
npm test
npm run typecheck
npm run build
```

Run the compiled CLI against the synthetic release fixture:

```bash
npm run build
node dist/cli.js --help
node dist/cli.js doctor --fixture tests/fixtures/e2e-persona/scannable.json
node dist/cli.js plan --fixture tests/fixtures/e2e-persona/scannable.json --json
node dist/cli.js import --fixture tests/fixtures/e2e-persona/scannable.json --repo tmp/agent-brain-preview
node dist/cli.js apply --fixture tests/fixtures/e2e-persona/scannable.json --target-root /synthetic/target --json
node dist/cli.js verify --fixture tests/fixtures/e2e-persona/scannable.json --target-root /synthetic/target --json
node dist/cli.js rollback --json
node dist/cli.js explain-conflict '~/.codex/history.jsonl'
node dist/cli.js explain-conflict '~/.claude/skills/review/SKILL.md' --json
```

`apply` reports a dry-run fingerprint unless you pass the exact `--confirm-fingerprint` value from that dry-run. `rollback` fails until snapshot metadata is supplied; that is intentional and prevents a missing rollback record from looking successful.

## Contributing

Agent Brain is open to contributors who want agent workspaces to become more legible, portable, and safe. The most helpful contributions improve ownership classification, adapter behavior, CLI safety gates, synthetic fixtures, documentation, release evidence, or the contributor experience around guarded live use.

Start with the [Contributing guide](https://github.com/leonardsellem/agent-brain/blob/dev/CONTRIBUTING.md). It covers project boundaries, good first contributions, local setup, TDD expectations, safety rules, pull request checks, and release/security boundaries.

## Development

This repository is optimized for agent-native development:

- Plan before coding.
- Write or update a failing test before behavior changes.
- Keep filesystem, git, and process effects behind ports so tests can run against fixtures.
- Treat Claude Code and Codex app homes as materialization targets, not as the canonical Agent Brain source of truth.
- Run `npm test` and `npm run typecheck` before handoff.

Useful docs:

- [Architecture](https://github.com/leonardsellem/agent-brain/blob/dev/docs/architecture.md)
- [Adapter contract](https://github.com/leonardsellem/agent-brain/blob/dev/docs/adapter-contract.md)
- [Safety model](https://github.com/leonardsellem/agent-brain/blob/dev/docs/safety-model.md)
- [Contributing guide](https://github.com/leonardsellem/agent-brain/blob/dev/CONTRIBUTING.md)
- [Agent handoff](https://github.com/leonardsellem/agent-brain/blob/dev/docs/agent-handoff.md)
- [Agent instructions](https://github.com/leonardsellem/agent-brain/blob/dev/AGENTS.md)

## Repository Status

Agent Brain is pre-1.0 and publicly released on npm. The CLI is suitable for guarded live use against explicit `.codex`, `.claude`, `.dotstate`, disposable, or other user-approved roots when the documented dry-run, snapshot, verify, and rollback gates are followed.

The default development branch is `dev`; `main` is the integration target.

The npm package is configured for public launch as `@leonardsellem/agent-brain`; publication is handled through deliberate release automation rather than ordinary branch merges.

## Roadmap

Near-term:

- Deepen real Claude Code and Codex adapter fixtures.
- Expand import heuristics for dotstate, chezmoi, stow, bare dotfiles, and unmanaged home roots.
- Harden release evidence around live apply confirmation, snapshot storage, verification, and rollback metadata.
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
