---
title: Live Personal npm E2E Findings Template
---

# Live Personal npm E2E Findings Template

Use this template after running the [live personal npm E2E protocol](live-personal-npm-e2e-protocol.md). It is a tracked, public-safe summary shape, not a raw evidence dump.

raw screenshots, terminal logs, npm outputs, Computer Use captures, generated repos, snapshots, auth material, histories, private paths, and machine-local state must not be copied into this tracked template. Keep raw material under `artifacts/live-personal-npm-e2e/` and reference only sanitized evidence labels here.

## Verdict

- go/no-go verdict:
- Highest severity:
- Release scope tested:
- Ring 2 status: completed, Ring 2 skipped, Ring 2 declined, or stopped before Ring 2
- Rollback status: proven, approved recovery evidence, unproven, or not applicable

## Environment

- Package name:
- Package version:
- npm dist tag:
- Install or execution method:
- Binary path shape:
- Node.js version:
- Operating system:
- Terminal or desktop surface used with Computer Use:
- Private artifact root: `artifacts/live-personal-npm-e2e/`

## Ring 0 Readiness

- Selected `.codex` root:
- Selected `.claude` root:
- Selected `.dotstate` root:
- tracked-root recoverability:
- local-change status:
- Stop conditions found:
- Owner decision:

## Ring 1 Evidence

- Help and command discovery:
- Diagnosis command intent:
- Import destination:
- Planning or dry-run command intent:
- Conflict explanation command intent:
- Computer Use-visible observations:
- Non-mutating guarantee reviewed:
- Ring 1 result:

## Ring 2 Decision

- Fresh owner approval captured:
- Exact dry-run fingerprint:
- Baseline snapshot evidence:
- Apply evidence:
- Materialization lock evidence:
- Verify evidence:
- Rollback or approved recovery evidence:
- post-test diff inspection:
- Ring 2 result:

If Ring 2 skipped, declined, or stopped, explain why without implying live mutation safety was proven.

## Findings

Use one entry per finding.

### Finding: short title

- Category: `bug`, `friction`, `trust gap`, `docs gap`, `product gap`, `release-positioning gap`, or `polish`
- Severity: `release blocker`, `high`, `medium`, or `low`
- Command intent:
- Observed behavior:
- Expected behavior:
- Safety impact:
- sanitized reproduction context:
- Sanitized evidence pointer:
- Blocks broader live testing:
- Follow-up owner:

## Stop Conditions

- Stop condition:
- Ring:
- Trigger:
- Owner decision:
- Follow-up:

## Follow-Up

- Product fixes:
- Documentation fixes:
- Release-positioning changes:
- Open safety questions:
- Verification still needed:
