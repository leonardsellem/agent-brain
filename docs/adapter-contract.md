# Adapter Contract

Adapters isolate app-specific behavior from the canonical Agent Brain model. They let Agent Brain speak one ownership vocabulary while respecting the fact that Claude Code, Codex, and future targets can store similar concepts in different places with different rules.

Read this with the [architecture](architecture.md) and [safety model](safety-model.md).

## Responsibilities

Every adapter is responsible for describing one target app clearly enough for diagnosis, import, materialization, verification, and conflict explanation.

An adapter must define:

- Known user-level roots and project overlay roots.
- Portable authoring surfaces that can become package source.
- Generated target surfaces that Agent Brain may own after apply.
- App-native configuration and state that should remain app-owned.
- Runtime, cache, auth, secret, and local-only exclusions.
- Verification checks for generated output, missing files, and drift.
- Conflict recommendations for paths the adapter understands.

Adapters must not decide the durable product model. If a target app changes, update adapter facts and tests first. Only change package, profile, provenance, or lock fields when the portable model itself has genuinely evolved.

## Ownership Vocabulary

All adapters use the same classifications:

| Classification | Adapter meaning |
| --- | --- |
| `portable-source` | A human-authored capability surface that can be adopted into Agent Brain. |
| `generated-target` | A path produced from canonical intent and tracked by a materialization lock. |
| `native-owned` | App configuration or app state that belongs to the target's own semantics. |
| `runtime-cache` | Generated, cached, historical, or runtime-only app data. |
| `machine-local` | Local-only paths, trust decisions, overrides, or machine-specific state. |
| `secret` | Auth files, tokens, keys, sessions, and secret-like content. |
| `foreign-owned` | Material owned by another tool or source of truth. |
| `unknown` | Material that needs human review before import or mutation. |

The same classification should mean the same operational thing across diagnosis, import, verify, rollback, and conflict explanation.

## Adapter Interface

Current implementation details live in `src/adapters/`, but the semantic interface is stable:

1. Identify known roots and target surfaces.
2. Classify paths using the shared ownership vocabulary.
3. Describe where canonical packages materialize for this target.
4. Provide exclusions for runtime, auth, generated, and machine-local files.
5. Verify that generated targets match their materialization locks.
6. Explain conflicts in ownership terms.

Semantic parity matters more than path parity. A Claude Code skill and a Codex skill may materialize to different paths, but both should be classified and verified through the same package and ownership concepts.

## MVP Adapters

Claude Code and Codex are the first adapters.

The MVP should cover:

- Skills and skill-like package source.
- App and plugin configuration surfaces.
- MCP and connector intent where portable.
- Native app settings that should not be canonicalized blindly.
- Runtime histories, caches, auth material, generated schemas, and local project trust as exclusions.
- Shared-root detection when multiple apps physically point at the same mutable surface.

The adapters should be conservative when app behavior is uncertain. Unknown is a valid answer when the alternative is adopting or overwriting the wrong thing.

## Drift Policy

Coding-agent apps evolve quickly. When a target app changes config, skill, plugin, hook, MCP, app, or generated-state semantics:

1. Add or update an adapter fixture that captures the observed change.
2. Update adapter classification and verification tests.
3. Adjust the adapter implementation.
4. Update this contract only when the shared obligations change.
5. Avoid changing the canonical model unless the durable product concept changed.

If a target path moves but the portable meaning is unchanged, that is adapter drift. If Agent Brain needs a new durable concept, that is model evolution.

## Related Files

- [Architecture](architecture.md)
- [Safety model](safety-model.md)
- [Agent handoff](agent-handoff.md)
- [Claude Code adapter](../src/adapters/claude-code.ts)
- [Codex adapter](../src/adapters/codex.ts)
