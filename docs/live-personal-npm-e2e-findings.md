---
title: Live Personal npm E2E Findings
---

# Live Personal npm E2E Findings

This report summarizes the sanitized Ring 1 and Ring 2 runs of the [live personal npm E2E protocol](live-personal-npm-e2e-protocol.md). Raw terminal logs, stderr, JSON outputs, snapshots, and package artifacts remain private; this file keeps only public-safe observations.

## Verdict

- go/no-go verdict: go for the bounded personal-live canary release claim.
- Highest severity: medium.
- Release scope tested: npm-installed CLI discovery, real-root diagnosis, live source planning/import, dry-run evidence, canary live apply, verify, rollback, and post-test diff inspection.
- Ring 2 status: completed with an owner-approved canary package after Ring 1 passed.
- Rollback status: proven; the generated canary file and empty directory were removed.

## Environment

- Package name: `@leonardsellem/agent-brain`.
- Package version: local packed candidate for this branch, based on `0.1.1`.
- npm dist tag: not applicable to the branch-local candidate package.
- Install or execution method: isolated npm prefix from a locally packed tarball.
- Binary path shape: isolated npm `.bin/agent-brain`.
- Node.js version: observed through the installed CLI runtime.
- Operating system: macOS.
- Terminal or desktop surface used with Computer Use: terminal app access was unavailable; TextEdit was accessible for sanitized visible evidence review.
- Private artifact root: private ignored `artifacts` run directory.

## Ring 0 Readiness

- Selected `.codex` root: real personal root.
- Selected `.claude` root: real personal root.
- Selected `.dotstate` root: real personal dotstate-backed storage.
- tracked-root recoverability: roots resolve into a shared git-backed storage repository.
- local-change status: modified and untracked entries were present before the run.
- Stop conditions found: pre-existing local changes were present, so Ring 2 used a unique canary path rather than broad live materialization.
- Owner decision: proceed with Ring 1; automatically approve Ring 2 after Ring 1 passed; separately confirm rollback deletion and empty-directory cleanup.

## Ring 1 Evidence

- Help and command discovery: installed `agent-brain --help`, `doctor --help`, and `apply --help` rendered command and option guidance.
- Diagnosis command intent: `doctor` with explicit real personal roots and JSON output.
- Import destination: explicit private Agent Brain repo under the ignored artifact root.
- Planning or dry-run command intent: `plan` against real dotstate-backed source and dry-run `apply` against real `.claude` and `.codex` roots.
- Conflict explanation command intent: `explain-conflict` for a runtime-cache path.
- Computer Use-visible observations: attempted terminal access was blocked by the desktop safety layer; TextEdit access was available for sanitized evidence review, while raw CLI evidence stayed in private artifacts.
- Non-mutating guarantee reviewed: Ring 1 completed without live target mutation.
- Ring 1 result: passed.

## Ring 2 Decision

- Fresh owner approval captured: automatic Ring 2 approval after Ring 1 passed, plus action-time confirmation for rollback and cleanup deletion.
- Exact dry-run fingerprint: captured for the unique canary apply.
- Baseline snapshot evidence: snapshot metadata created before the canary write.
- Apply evidence: one canary skill file was generated under the real `.claude` root.
- Materialization lock evidence: lock metadata was written in the private Agent Brain repo.
- Verify evidence: verify passed with zero findings after apply.
- Rollback or approved recovery evidence: rollback restored the missing pre-state and deleted the generated canary file.
- post-test diff inspection: completed; no canary file or directory remained after cleanup.
- Ring 2 result: passed.

## Findings

### Finding: real dotstate-backed diagnosis exhausted heap

- Category: `bug`.
- Severity: resolved.
- Command intent: diagnose real tracked personal `.codex`, `.claude`, and `.dotstate` roots without mutation.
- Observed behavior: the npm-installed CLI exited 134 before JSON output and stderr reported `Node heap out of memory`.
- Expected behavior: diagnosis should complete, stream or bound traversal, or fail closed with a clear actionable error before exhausting memory.
- Safety impact: fixed by bounded file sampling, cache/worktree pruning, skipped-directory findings, and a higher traversal ceiling.
- sanitized reproduction context: npm-installed `doctor` with explicit personal roots where the dotstate-backed storage is large and git-backed.
- Sanitized evidence pointer: private Ring 1 stderr and fixed-run JSON artifacts.
- Blocks broader live testing: no.
- Follow-up owner: none for this blocker.

### Finding: command-specific help is too terse

- Category: `friction`.
- Severity: resolved.
- Command intent: discover command usage through `agent-brain <command> --help`.
- Observed behavior: command-specific help printed only the command name and a short sentence.
- Expected behavior: command-specific help should show relevant options such as explicit roots, repo, target root, adapter, profile, JSON output, and fingerprint confirmation where applicable.
- Safety impact: fixed by command-specific option help.
- sanitized reproduction context: npm-installed command help for the public CLI.
- Sanitized evidence pointer: private help artifact.
- Blocks broader live testing: no, but it increases live-use friction.
- Follow-up owner: none for this blocker.

### Finding: nested live skills caused noisy import conflicts

- Category: `bug`.
- Severity: resolved.
- Command intent: plan/import real dotstate-backed source into a private Agent Brain repo.
- Observed behavior: nested skills and Codex worktree copies produced package-name conflicts.
- Expected behavior: generated/cache/worktree roots should be pruned, and nested skills should preserve enough namespace to avoid false package ID collisions.
- Safety impact: fixed by pruning worktree/temp roots and namespacing nested skill package IDs.
- sanitized reproduction context: real dotstate-backed source with nested `.system` skills and Codex worktree copies.
- Sanitized evidence pointer: private Ring 1 plan/import artifacts.
- Blocks broader live testing: no.
- Follow-up owner: none for this blocker.

### Finding: Computer Use terminal access unavailable

- Category: `friction`.
- Severity: `medium`.
- Command intent: observe the npm-installed CLI through a visible terminal with Computer Use.
- Observed behavior: Computer Use could list apps but could not use the available terminal or Codex app surfaces.
- Expected behavior: the live-test protocol should name an accessible fallback or explicitly record that terminal-visible evidence could not be collected.
- Safety impact: Agent Brain behavior was validated through npm-installed CLI artifacts; TextEdit remained available for sanitized visible evidence, but terminal control was unavailable in this desktop session.
- sanitized reproduction context: local desktop test harness denied terminal app access.
- Sanitized evidence pointer: private tool output in session transcript.
- Blocks broader live testing: no.
- Follow-up owner: test protocol execution environment.

## Stop Conditions

- Stop condition: Node heap out of memory.
- Ring: Ring 1.
- Trigger: unbounded live scan on real dotstate-backed roots.
- Owner decision: fixed and rerun.
- Follow-up: resolved.

- Stop condition: import conflicts.
- Ring: Ring 1.
- Trigger: nested skill naming and worktree traversal noise.
- Owner decision: fixed and rerun.
- Follow-up: resolved.

## Follow-Up

- Product fixes: none blocking for the bounded canary claim.
- Documentation fixes: keep the protocol stop condition and findings template linked from README and release docs.
- Release-positioning changes: personal-live readiness is proven for diagnosis, import, dry-run, and a narrow canary apply/verify/rollback; broad 154-package live materialization remains intentionally unclaimed.
- Open safety questions: decide whether local untracked entries should block all future live tests or only Ring 2 mutation.
- Verification still needed: rerun with Computer Use terminal evidence if the desktop safety allowlist later permits terminal app control.
