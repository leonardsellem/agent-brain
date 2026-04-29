---
title: Live Personal npm E2E Protocol
---

# Live Personal npm E2E Protocol

This protocol is for testing Agent Brain as an npm-installed product against the owner's real, git-tracked `.codex`, `.claude`, and `.dotstate` setup. It is stricter than the disposable-root [live release rehearsal](release-live-e2e-rehearsal.md) because the target folders contain valuable working state.

The persona is a cautious power user installing from npm, reading public docs, and asking the CLI to explain real agent-app state before trusting it with any write.

## Scope

Use this protocol when the test target is a real personal agent setup rather than a synthetic fixture or disposable root.

Allowed in Ring 1:

- Install or execute the published npm package in an isolated prefix or other explicit npm test location.
- Use Computer Use-visible terminal observation for the user journey, so evidence reflects what a real user would see.
- Run diagnosis, import into an explicit Agent Brain destination, planning, conflict explanation, dry-run apply output, and findings capture.
- Read tracked-root recoverability and local-change status from git without changing the live roots.

Blocked until Ring 2:

- Mutating real `.codex`, `.claude`, or `.dotstate` target paths.
- Treating an early approval as permission for later apply, rollback, or recovery steps.
- Copying runtime histories, caches, auth material, tokens, private local overrides, or unknown material into canonical packages.
- Publishing raw screenshots, terminal logs, generated live-test artifacts, or private path evidence.

## Ring 0 Readiness Gate

Ring 0 decides whether the live personal run is allowed to start. Stop and ask the owner before Ring 1 if any answer is unclear.

Record:

- npm package identity, version, dist tag, install source, and executable path.
- The exact roots selected for `.codex`, `.claude`, and `.dotstate`.
- tracked-root recoverability for each selected root, including whether the root is under git and which branch or detached state is active.
- local-change status for each selected root, including untracked files when available.
- The private raw artifact directory for this run: `artifacts/live-personal-npm-e2e/`.
- The command surface that will be observed through Computer Use.

Stop conditions:

- A selected root is not recoverable enough for the owner to accept risk.
- Local changes are present and the owner has not approved testing around them.
- The npm command cannot be tied to the intended published package.
- Secret-like material, unreadable paths, broken symlinks, or shared mutable roots appear before ownership is clear.
- The terminal or desktop evidence surface is contaminated by unrelated private state that cannot be sanitized.

## Ring 1 Non-Mutating npm Pass

Ring 1 is npm-first, Computer Use-visible, and non-mutating for live app roots.

Run the journey as a real user would:

1. Install or execute `@leonardsellem/agent-brain` from npm in the selected isolated npm environment.
2. Open a terminal through Computer Use and discover `agent-brain --help` plus command-specific help from the installed binary.
3. Run `doctor` with explicit live roots and capture the ownership/risk report.
4. Run `import` only into an explicit Agent Brain destination outside the live app roots.
5. Run `plan`, `explain-conflict`, and dry-run `apply` commands that produce reviewable intent without writing to the live target.
6. Collect frictions, mismatches, missing docs, confusing output, and trust gaps into the sanitized findings shape.

Ring 1 is incomplete if the evidence is shell-only and not Computer Use-visible. Shell logs can supplement the pass, but the final report should say what the user visibly saw.

Ring 1 stop conditions:

- `doctor`, `import`, `plan`, `explain-conflict`, or dry-run `apply` appears to write under a live root.
- The dry-run omits an exact dry-run fingerprint for a future apply.
- Output fails to explain ownership, exclusions, or unknown material clearly enough for a cautious user.
- The npm package behavior differs from README or companion docs in a way that could cause unsafe copy-paste.
- Raw evidence cannot be sanitized without losing the finding's meaning.

## Ring 2 Owner-Approved Live Mutation Pass

Ring 2 can only start after Ring 1 findings are reviewed and the owner gives fresh owner approval for the exact dry-run target, command, and fingerprint.

Required evidence before any write:

- Ring 0 is still current, or changes since Ring 0 are explicitly recorded.
- The exact dry-run fingerprint is copied from the reviewed dry-run output.
- The target root, adapter, profile, repo destination, and package version are unchanged since review.
- A baseline snapshot location is known and will be captured before mutation.
- The owner has approved the exact command rather than a general live-testing intent.

Required evidence after mutation:

- Apply output references the confirmed fingerprint.
- Baseline snapshot metadata exists for every touched path.
- Materialization lock evidence exists for generated target ownership.
- Verify output is captured and reviewed.
- rollback or approved recovery evidence is captured. If rollback is skipped, the report must say rollback is unproven.
- post-test diff inspection is performed for every tracked live root before success is claimed.

Ring 2 stop conditions:

- Fingerprint drift, ambiguous dry-run output, missing snapshot metadata, failed verification, secret concerns, unexpected writes, or unclear ownership.
- Rollback cannot be proven and the owner has not approved equivalent recovery evidence.
- Any live root diff contains changes outside the approved dry-run.

## Private Artifact Handling

Raw evidence belongs under `artifacts/live-personal-npm-e2e/`. That directory is private, gitignored, and must not be linked from README, release notes, npm package contents, or public issues.

Raw screenshots, terminal logs, npm outputs, generated repos, snapshots, dry-run JSON, and Computer Use captures must stay private until a sanitization pass proves that they contain no private paths, auth material, histories, account identifiers, or machine-local state.

Durable findings should use [the sanitized findings template](live-personal-npm-e2e-findings-template.md). The tracked report may include sanitized command intent and observations, but it must not copy raw personal evidence.

## Finding Taxonomy

Use the same taxonomy as the [release E2E rehearsal](release-e2e-rehearsal.md):

| Category | Meaning |
| --- | --- |
| `bug` | Behavior is wrong or fails unexpectedly. |
| `friction` | Behavior works but slows the user down or creates uncertainty. |
| `trust gap` | Safety, ownership, rollback, or provenance is claimed without enough visible proof. |
| `docs gap` | README or companion docs omit, over-promise, or under-explain a needed step. |
| `product gap` | A needed user journey is not available through the product surface. |
| `release-positioning gap` | The app may be useful, but public claims need narrower wording. |
| `polish` | Output, naming, formatting, or terminal UX could be clearer. |

Severity levels are `release blocker`, `high`, `medium`, and `low`.

Each finding should include package version, command intent, observed behavior, expected behavior, safety impact, category, severity, sanitized reproduction context, and whether it blocks broader live testing.

## Go/No-Go Handoff

End every run with a go/no-go verdict:

- `go`: Ring 1 passed and Ring 2 either passed or was intentionally not required for the release claim.
- `conditional go`: Remaining findings are known and do not affect the promised release scope.
- `no-go`: Any release blocker, unsafe write, unreviewed live diff, missing recovery evidence, or unsanitized evidence dependency remains.

The handoff should name:

- npm package version and command source.
- Whether Ring 2 ran, was declined, was skipped, or stopped.
- The highest severity finding.
- Whether rollback was proven, replaced by approved recovery evidence, or unproven.
- Links to sanitized tracked findings only.
- Follow-up issues or plans for product fixes discovered by the run.
