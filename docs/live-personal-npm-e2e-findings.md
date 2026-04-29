---
title: Live Personal npm E2E Findings
---

# Live Personal npm E2E Findings

This report summarizes the first sanitized Ring 1 run of the [live personal npm E2E protocol](live-personal-npm-e2e-protocol.md). Raw terminal logs and stderr remain private; this file keeps only public-safe observations.

## Verdict

- go/no-go verdict: no-go for broader personal-live release claims.
- Highest severity: release blocker.
- Release scope tested: npm-installed CLI discovery plus attempted Ring 1 diagnosis against real tracked personal roots.
- Ring 2 status: Ring 2 skipped because Ring 1 stopped before successful diagnosis.
- Rollback status: not applicable; no live mutation was attempted.

## Environment

- Package name: `@leonardsellem/agent-brain`.
- Package version: `0.1.1`.
- npm dist tag: `latest`.
- Install or execution method: isolated npm prefix.
- Binary path shape: isolated npm `.bin/agent-brain`.
- Node.js version: observed through the installed CLI runtime.
- Operating system: macOS.
- Terminal or desktop surface used with Computer Use: Computer Use terminal access unavailable for the available terminal apps.
- Private artifact root: private ignored `artifacts` run directory.

## Ring 0 Readiness

- Selected `.codex` root: real personal root.
- Selected `.claude` root: real personal root.
- Selected `.dotstate` root: real personal dotstate-backed storage.
- tracked-root recoverability: roots resolve into a shared git-backed storage repository.
- local-change status: modified and untracked entries were present before the run.
- Stop conditions found: local changes block Ring 2 unless freshly reviewed and approved.
- Owner decision: proceed only with non-mutating Ring 1 observation.

## Ring 1 Evidence

- Help and command discovery: installed `agent-brain --help` rendered the top-level command list.
- Diagnosis command intent: run `doctor` with explicit real personal roots and JSON output.
- Import destination: not reached; diagnosis stopped before import.
- Planning or dry-run command intent: not reached.
- Conflict explanation command intent: not reached.
- Computer Use-visible observations: attempted terminal access was blocked by the desktop safety layer, so Ring 1 evidence used shell output with this limitation recorded.
- Non-mutating guarantee reviewed: no live apply, rollback, or target mutation command was attempted.
- Ring 1 result: stopped at diagnosis.

## Ring 2 Decision

- Fresh owner approval captured: not requested.
- Exact dry-run fingerprint: not produced.
- Baseline snapshot evidence: not produced.
- Apply evidence: not run.
- Materialization lock evidence: not produced.
- Verify evidence: not run.
- Rollback or approved recovery evidence: not applicable.
- post-test diff inspection: not applicable to mutation; no Ring 2 mutation occurred.
- Ring 2 result: Ring 2 skipped.

## Findings

### Finding: real dotstate-backed diagnosis exhausts heap

- Category: `bug`.
- Severity: `release blocker`.
- Command intent: diagnose real tracked personal `.codex`, `.claude`, and `.dotstate` roots without mutation.
- Observed behavior: the npm-installed CLI exited 134 before JSON output and stderr reported `Node heap out of memory`.
- Expected behavior: diagnosis should complete, stream or bound traversal, or fail closed with a clear actionable error before exhausting memory.
- Safety impact: a cautious user cannot complete Ring 1 on a real large personal setup, so broader live testing must stop before import or dry-run apply.
- sanitized reproduction context: npm-installed `doctor` with explicit personal roots where the dotstate-backed storage is large and git-backed.
- Sanitized evidence pointer: private Ring 1 stderr artifact.
- Blocks broader live testing: yes.
- Follow-up owner: product implementation.

### Finding: command-specific help is too terse

- Category: `friction`.
- Severity: `medium`.
- Command intent: discover command usage through `agent-brain <command> --help`.
- Observed behavior: command-specific help printed only the command name and a short sentence.
- Expected behavior: command-specific help should show relevant options such as explicit roots, repo, target root, adapter, profile, JSON output, and fingerprint confirmation where applicable.
- Safety impact: users are more likely to guess flags or copy examples without understanding required safety gates.
- sanitized reproduction context: npm-installed command help for the public CLI.
- Sanitized evidence pointer: private help artifact.
- Blocks broader live testing: no, but it increases live-use friction.
- Follow-up owner: CLI documentation and help output.

### Finding: Computer Use terminal access unavailable

- Category: `friction`.
- Severity: `medium`.
- Command intent: observe the npm-installed CLI through a visible terminal with Computer Use.
- Observed behavior: Computer Use could list apps but could not use the available terminal or Codex app surfaces.
- Expected behavior: the live-test protocol should name an accessible fallback or explicitly record that desktop-visible evidence could not be collected.
- Safety impact: the run still validates shell behavior, but it does not fully satisfy the Computer Use-visible evidence goal.
- sanitized reproduction context: local desktop test harness denied terminal app access.
- Sanitized evidence pointer: private tool output in session transcript.
- Blocks broader live testing: no, but it limits evidence quality.
- Follow-up owner: test protocol execution environment.

## Stop Conditions

- Stop condition: diagnosis failed before JSON output.
- Ring: Ring 1.
- Trigger: Node heap out of memory.
- Owner decision: stop before import, dry-run apply, or mutation.
- Follow-up: fix bounded traversal or graceful failure, then rerun Ring 1 before requesting any Ring 2 approval.

## Follow-Up

- Product fixes: make diagnosis safe on large dotstate-backed roots and add clear failure modes for traversal limits.
- Documentation fixes: keep the protocol stop condition and findings template linked from README and release docs.
- Release-positioning changes: avoid claiming personal-live readiness until Ring 1 completes on real tracked roots.
- Open safety questions: decide whether local untracked entries should block all future live tests or only Ring 2 mutation.
- Verification still needed: rerun Ring 1 with Computer Use-visible terminal evidence once an accessible terminal surface is available.
