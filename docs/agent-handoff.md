# Agent Handoff

Agent Brain is a local CLI for making AI coding-agent capability state portable, explainable, and safely mutable.

## Codebase vs Memory

- Implementation code lives in this repository.
- Durable project memory may live in external planning systems.
- Update external project memory when product decisions change, but keep product code in this repository.

## Development Loop

1. Read the relevant plan, requirement, and existing tests.
2. Write or update a failing test for behavior changes.
3. Implement the smallest production change that satisfies the test.
4. Run focused tests, then broader verification.
5. Commit a logical unit with a conventional message.

## Safety Posture

Agent Brain must explain ownership before mutation. Live target writes require a dry-run fingerprint, explicit confirmation, a baseline snapshot, verification, and rollback metadata.
