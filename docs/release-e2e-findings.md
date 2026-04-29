---
title: Release E2E Findings
---

# Release E2E Findings

## Verdict

Agent Brain is **developer-preview release-candidate ready for fixture-backed CLI validation**, but **still not ready to claim live setup migration**.

The core model, classification language, command envelope, and apply/rollback primitives now line up with the public fixture-backed CLI. Live home-directory scanning, real target mutation, and durable snapshot storage remain deferred release work.

## Evidence

The rehearsal followed the target persona from [README.md](../README.md), then compared public CLI behavior with fixture-backed integration coverage.

Original public CLI pass:

- `npm run build` completed successfully.
- `node dist/cli.js --help` failed because the build emits `dist/src/cli.js`, while README and `package.json` point at `dist/cli.js`.
- `node dist/src/cli.js --help` listed every documented command.
- `node dist/src/cli.js doctor --help` returned a concise command purpose.
- `node dist/src/cli.js docter` returned a readable unknown-command suggestion list.
- `node dist/src/cli.js doctor --json --target-root` returned a parseable structured error.
- `node dist/src/cli.js doctor` returned `No scannable fixture entries supplied`.
- `node dist/src/cli.js plan --json` and `node dist/src/cli.js import --json` failed with fixture-only errors.
- `node dist/src/cli.js explain-conflict 'packages/review/SKILL.md' --json` classified portable source correctly.
- `node dist/src/cli.js explain-conflict '~/.codex/auth.json' --json` classified secret-like target state correctly when the path was quoted.
- `node dist/src/cli.js explain-conflict '~/.codex/history.jsonl'` classified runtime-cache target state correctly when the path was quoted.
- `node dist/src/cli.js apply --json` reported a snapshot id but no operations, target, dry-run fingerprint, or verification linkage.
- `node dist/src/cli.js verify --json` reported zero findings without proving a target or lock was inspected.
- `node dist/src/cli.js rollback --json` said rollback requires snapshot metadata while still returning success.

Remediated public CLI contract:

- `npm run build` emits the package binary at `dist/cli.js`.
- `node dist/cli.js doctor --fixture tests/fixtures/e2e-persona/scannable.json` scans the public synthetic fixture and reports shared-root risk.
- `node dist/cli.js plan --fixture tests/fixtures/e2e-persona/scannable.json --json` reports portable packages plus excluded and rejected non-portable state.
- `node dist/cli.js import --fixture tests/fixtures/e2e-persona/scannable.json --repo tmp/agent-brain-preview` writes only canonical Agent Brain files under the explicit destination.
- `node dist/cli.js apply --fixture tests/fixtures/e2e-persona/scannable.json --target-root /synthetic/target --json` returns dry-run operations and a fingerprint without claiming mutation.
- `node dist/cli.js verify --fixture tests/fixtures/e2e-persona/scannable.json --target-root /synthetic/target --json` reports the target root and derived lock entries it checked.
- `node dist/cli.js rollback --json` fails with `snapshot_required`.
- `node dist/cli.js explain-conflict '~/.codex/history.jsonl'` keeps home-relative paths portable, and shell-expanded home paths are normalized in public output.

Fixture-backed integration pass:

- `npm test -- tests/integration/doctor.test.ts tests/integration/import.test.ts tests/integration/explain-conflict.test.ts tests/integration/apply-rollback.test.ts tests/integration/verify.test.ts` passed 5 files and 6 tests.
- Integration tests prove shared-root diagnosis, import planning, conflict explanation, verify reporting, and virtual apply/rollback primitives when command dependencies are injected in tests.

Ghostty pass:

- Ghostty was launched with a dedicated Agent Brain command sequence.
- Computer Use refused direct access to the Ghostty bundle, so app-state screenshots through Computer Use were unavailable.
- A raw full-screen capture was kept in the gitignored raw artifact area for local inspection only. It contained unrelated desktop context and was rejected for README use.

## Findings

### F1. Built CLI Path Is Wrong

- **Category:** bug
- **Severity:** remediated release blocker
- **Evidence:** `npm run build` emits `dist/src/cli.js`; README Quick Start and `package.json` bin expect `dist/cli.js`.
- **Expected:** A fresh user can run the documented compiled CLI and the published package bin resolves to an existing file.
- **Actual:** The documented command fails with Node's raw module-not-found stack.
- **User impact:** The first hands-on command after a successful build fails before the product can explain itself.
- **Recommended owner:** CLI packaging/build.

### F2. Public Import and Plan Flows Are Fixture-Only

- **Category:** product gap
- **Severity:** remediated for developer preview; still a release blocker for live migration claims.
- **Evidence:** Public `plan --json` and `import --json` return `requires a scannable filesystem fixture`; scannable entries are available through injected test ports, not a documented CLI option.
- **Expected:** A persona can point Agent Brain at a sanitized source root or known app surface and receive an adoption plan.
- **Actual:** The public CLI cannot consume the synthetic fixture from the shell.
- **User impact:** The main migration story exists in tests and architecture, but not in a normal terminal workflow.
- **Recommended owner:** CLI import surface and filesystem port wiring.

### F3. Doctor Has No Actionable Real-World Discovery Path

- **Category:** release-positioning gap
- **Severity:** remediated for developer preview; live discovery remains deferred.
- **Evidence:** `doctor` succeeds with `No scannable fixture entries supplied`.
- **Expected:** A fresh user understands what Agent Brain scanned, what it refused to scan, and how to provide a safe fixture or target.
- **Actual:** The command returns success with no next step.
- **User impact:** The safest first command does not yet build trust or guide the user into the fixture-first preview.
- **Recommended owner:** CLI diagnosis UX and README positioning.

### F4. Conflict Explanation Can Leak Shell-Expanded Local Paths

- **Category:** trust gap
- **Severity:** remediated.
- **Evidence:** Unquoted home-relative examples are expanded by the shell before Agent Brain receives them; quoted examples preserve the portable form.
- **Expected:** Public docs and examples avoid encouraging users to emit private absolute paths in output.
- **Actual:** README examples use unquoted home-relative paths.
- **User impact:** Users can accidentally copy private machine paths into issues, logs, screenshots, or release notes.
- **Recommended owner:** README examples and optional CLI path normalization.

### F5. Apply Success Does Not Prove Safe Mutation

- **Category:** trust gap
- **Severity:** remediated for fixture-backed dry-run; still a release blocker for live apply claims.
- **Evidence:** Public `apply --json` returns success and a snapshot id even though it applies an empty dry-run to an in-memory target.
- **Expected:** Apply output names the target, dry-run operations, fingerprint, snapshot contents, verification linkage, and rollback metadata.
- **Actual:** The command reports success without enough evidence for a cautious user.
- **User impact:** The output shape can create false confidence before the live apply transaction is truly wired.
- **Recommended owner:** Apply command surface and safety lifecycle.

### F6. Verify and Rollback Are Too Thin for Release Trust

- **Category:** trust gap
- **Severity:** remediated for missing-evidence behavior.
- **Evidence:** Public `verify --json` reports zero findings without a target or lock; public `rollback --json` says snapshot metadata is required but exits successfully.
- **Expected:** Verify should prove what it checked; rollback should fail clearly when required snapshot metadata is missing.
- **Actual:** Both commands can look successful while doing little or nothing.
- **User impact:** The persona cannot trust the safety model from the CLI alone.
- **Recommended owner:** Verify/rollback command surfaces.

### F7. Ghostty Evidence Is Currently Raw-Only

- **Category:** friction
- **Severity:** medium
- **Evidence:** Ghostty launched and displayed the command sequence, but Computer Use refused direct access to the app and the fallback full-screen capture included unrelated local context.
- **Expected:** A clean terminal-only capture can illustrate stable CLI behavior.
- **Actual:** The available capture is useful only as local raw evidence.
- **User impact:** README screenshots should be deferred until the CLI output is stable and capture tooling can isolate the terminal safely.
- **Recommended owner:** Release evidence workflow.

### F8. Fixture-Backed Internals Are Healthier Than the Public Surface

- **Category:** release-positioning gap
- **Severity:** medium
- **Evidence:** Integration tests passed for doctor/import/conflict/verify/apply-rollback primitives.
- **Expected:** Public release language mirrors what a user can actually run.
- **Actual:** Internal primitives are stronger than the current black-box CLI journey.
- **User impact:** The project can honestly ship a developer preview, but not a broad "migrate your setup" promise yet.
- **Recommended owner:** Release positioning and CLI follow-through.

## Follow-Up

Remaining follow-up split:

- **Release blocker for live migration:** design and implement live scanner UX for real app roots.
- **Release blocker for live apply:** persist durable snapshot metadata and lock files for real targets.
- **High:** add a clean terminal capture workflow before promoting README screenshots.
- **Medium:** continue deepening Claude Code and Codex adapter fixtures beyond the current synthetic persona.

Tracker status: Linear issue creation/commenting requires explicit action-time confirmation because it transmits this release report to a third-party service. The local report is complete and ready to use as the issue body.
