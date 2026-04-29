# Adapter Contract

Adapters isolate app-specific semantics from the canonical Agent Brain model.

## Shared Vocabulary

Every adapter classifies paths with the same ownership vocabulary:

- `portable-source`
- `generated-target`
- `native-owned`
- `runtime-cache`
- `machine-local`
- `secret`
- `foreign-owned`
- `unknown`

## Adapter Duties

An adapter describes:

- Known app roots and project overlays.
- Portable authoring surfaces.
- Generated target surfaces.
- Native-owned configuration and app state.
- Runtime, cache, auth, secret, and local-only exclusions.
- Verification checks for generated output and drift.

## MVP Targets

Claude Code and Codex are the first adapters. They may expose similar concepts through different layouts, so tests assert semantic parity through the shared vocabulary rather than identical target paths.

## Drift Handling

When an app changes config, skill, plugin, hook, or MCP semantics, update the relevant adapter facts and contract tests. Do not change canonical package/profile/provenance fields unless the durable product model itself needs to evolve.

## Conflict Parity

Conflict explanation reuses the same vocabulary as diagnosis, import, verify, and adapters. A conflict in Codex generated output and a conflict in Claude Code generated output can have different paths while sharing the same `generated-target` recommendation.
