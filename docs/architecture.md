# Architecture

Agent Brain stores portable intent, not app home directories.

## Durable Model

- **Packages** describe portable capability source such as skills, plugins, prompts, MCP definitions, or app connector intent.
- **Profiles** choose packages and target adapters for a working setup.
- **Provenance** records where an item came from, which target adapter observed it, how it was classified, and confidence.
- **Exclusions** explain why runtime, cache, auth, secret, local-only, app-native, foreign, or unknown files are not canonical package source.
- **Materialization locks** map canonical package intent to generated target paths for a specific adapter and target root.

## Boundary

Claude Code and Codex are materialization targets. Their native settings, caches, auth files, generated schemas, histories, and runtime state remain app-owned unless a user explicitly classifies portable source.

## Safety

Live target mutation must follow this sequence:

1. Dry-run plan with a fingerprint.
2. Explicit confirmation of that fingerprint.
3. Baseline snapshot.
4. Narrow mutation through an adapter.
5. Verification.
6. Rollback metadata.

## Conflict Explanation

Conflicts should be explained in ownership terms. Portable source conflicts are resolved in Agent Brain package/profile files. Generated target conflicts should be regenerated from canonical intent. Runtime, cache, auth, local-only, foreign, and unknown paths should not be merged into canonical source without explicit classification.
