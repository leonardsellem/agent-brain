---
date: 2026-04-30
topic: setup-autopilot
---

# Agent Brain Setup Autopilot Requirements

## Summary

Agent Brain should add a friendly first-run `agent-brain setup` flow that discovers real local agent roots, follows symlinks into source-of-truth folders such as dotstate-managed storage, assists classification, imports portable material into a default `~/.agent-brain` repo, and optionally rewrites generated-owned live target paths only after backup, dry-run, and exact fingerprint confirmation.

This flow should make the safe path obvious for a solo power user who already has Claude Code, Codex, and installer-managed skills on their machine, without requiring them to understand every expert flag before they can get started.

---

## Problem Frame

The current expert commands are technically explicit but not self-explanatory for a new installed CLI user. `doctor` can identify obvious home import sources, but `import`, `plan`, and `bootstrap` require flags that are hard to infer from `doctor` output. When local roots are symlinked into a dotstate-style source-of-truth folder, the CLI may show only the visible app homes even though the meaningful package architecture lives behind symlinks.

A first-run user should be able to run one command, see what Agent Brain found, understand which material is safe to import, approve a simple summary, and optionally complete a safe local migration. Expert commands should remain available, but the default path should feel guided, recoverable, and concrete.

---

## Actors

- A1. Solo power user: Has existing local agent app roots and wants Agent Brain to organize them safely.
- A2. Setup assistant: The friendly `agent-brain setup` command that discovers, explains, imports, plans, and optionally applies.
- A3. Local source roots: Home app roots, symlink targets, dotstate-managed folders, and installer target folders such as `~/.agents`.
- A4. Live target roots: App homes that may receive generated-owned material after explicit confirmation.
- A5. Downstream planning agent: Converts this requirements capture into implementation work without inventing product behavior.

---

## Key Flows

- F1. First-run discovery and topology explanation
  - **Trigger:** A user runs `agent-brain setup` after installing the CLI.
  - **Actors:** A1, A2, A3
  - **Steps:** Setup scans likely agent surfaces, follows symlinks read-only, detects source-of-truth topology, identifies candidate roots, and explains what it found before writing anything.
  - **Outcome:** The user understands visible roots, real backing roots, and likely import sources.
  - **Covered by:** R1, R2, R3, R6, R7, R8, R9, R10, R11, R12

- F2. Assisted classification and import
  - **Trigger:** Discovery finds portable candidates, unknown material, or exclusions.
  - **Actors:** A1, A2, A3
  - **Steps:** Setup groups candidates by classification, shows a simple summary with counts and safety notes, asks for one confirmation, and imports approved portable material into the default repo.
  - **Outcome:** `~/.agent-brain` contains canonical Agent Brain material with a default profile and inferred adapter targets.
  - **Covered by:** R3, R4, R5, R13, R14, R15, R16, R17, R18

- F3. Optional live rewrite
  - **Trigger:** After import, the user chooses to update live app roots from the new Agent Brain repo.
  - **Actors:** A1, A2, A4
  - **Steps:** Setup prepares dry-runs, creates or announces backups, shows generated-owned changes, displays rollback evidence, requires the exact dry-run fingerprint, mutates only generated-owned paths, and verifies the result.
  - **Outcome:** Selected app roots are safely rewritten from Agent Brain output, with recovery information available.
  - **Covered by:** R19, R20, R21, R22, R23, R24, R25, R26, R27

- F4. Expert-command guidance
  - **Trigger:** A user runs an expert command without enough flags.
  - **Actors:** A1, A2
  - **Steps:** The expert command explains the missing input and points the user toward `agent-brain setup` when setup can discover reasonable defaults.
  - **Outcome:** Users are not stranded at terse flag errors.
  - **Covered by:** R28, R29, R30

---

## Requirements

**Setup entrypoint and defaults**
- R1. The CLI must expose `agent-brain setup` as the primary friendly onboarding command.
- R2. Expert commands such as `doctor`, `plan`, `import`, `bootstrap`, `apply`, `verify`, and `rollback` must remain available for explicit workflows.
- R3. Setup must default the Agent Brain repo destination to `~/.agent-brain` and show that destination before the first write.
- R4. Setup must create or use one default profile, `profile.default`, unless the user chooses a more advanced flow.
- R5. Setup must infer adapter targets from discovered app roots when confidence is high enough to explain the inference.

**Discovery and source topology**
- R6. Setup discovery must be read-only until the user explicitly approves an import.
- R7. Setup must use a general source discovery framework rather than a hard-coded Claude/Codex happy path.
- R8. Initial discovery must include common local agent surfaces, including `~/.claude`, `~/.codex`, and `~/.agents`.
- R9. Setup must follow symlinks automatically during read-only discovery and report both visible paths and real backing paths.
- R10. Setup must detect dotstate-style backing storage when path topology indicates a dotstate-managed source of truth.
- R11. Setup should also leave room for other source-control or dotfile-backed sources, such as chezmoi, stow, bare-git, or home-directory sources.
- R12. If discovery finds few or zero confident packages, setup must explain candidate groups, excluded material, and unknowns instead of ending with only a zero-count package summary.

**Assisted classification and import**
- R13. Setup must group discovered material into understandable classes, including portable candidates, profile or adapter candidates, unknown review items, and default-excluded material.
- R14. Setup must exclude secrets, auth material, runtime histories, caches, machine-local overrides, broken symlinks, unreadable paths, and unknown-risk material by default.
- R15. Before import writes to the Agent Brain repo, setup must show a simple summary with counts, categories, detected symlinks or backing sources, exclusions, and destination repo.
- R16. The import confirmation should be one clear approval step rather than an item-by-item review of every discovered file.
- R17. Import must write only to the canonical Agent Brain repo and must not mutate live app roots.
- R18. Import output must make it clear what was imported, what was skipped, and what still needs review.

**Optional live rewrite**
- R19. Setup may continue from import into a same-session live rewrite flow when the user explicitly chooses that path.
- R20. Before live mutation, setup must prepare a dry-run plan for each selected target root and show the dry-run fingerprint.
- R21. Before live mutation, setup must offer and create backups for selected live target roots, including current `~/.claude` and `~/.codex` when those roots are selected.
- R22. Backup handling should apply to every selected live target root, including `~/.agents` if setup supports rewriting it.
- R23. Setup must show backup location or recovery evidence before asking for live mutation confirmation.
- R24. Live mutation must touch generated-owned paths only and must never replace an entire live root or broad unknown subtree.
- R25. Live mutation must require the user to type or paste the exact dry-run fingerprint.
- R26. Live mutation must not offer a `--yes` shortcut that bypasses exact fingerprint confirmation.
- R27. After live mutation, setup must verify the selected target roots and report rollback or recovery instructions.

**Expert command guidance**
- R28. When `plan` or `import` is missing source flags, the CLI should suggest `agent-brain setup` and, when possible, show discovered source candidates.
- R29. When `bootstrap` is missing target or repo context, the CLI should suggest `agent-brain setup` for guided default repo and target selection.
- R30. Expert command errors must stay precise enough for automation users while being actionable for humans.

---

## Acceptance Examples

- AE1. **Covers R1, R3, R6, R8, R9, R10.** Given a user has `~/.claude` and `~/.codex` symlinked into dotstate-managed storage, when they run `agent-brain setup`, setup follows those symlinks read-only, reports visible and backing paths, and shows `~/.agent-brain` as the default destination without writing yet.
- AE2. **Covers R12, R13, R14.** Given setup cannot confidently identify many packages, when classification completes, the user still sees grouped candidates, unknown review items, and default exclusions rather than a bare `0 packages` result.
- AE3. **Covers R15, R16, R17, R18.** Given the user approves the import summary, when setup imports, it writes canonical material to `~/.agent-brain`, reports imported and skipped material, and does not change live app homes.
- AE4. **Covers R4, R5.** Given setup imports from detected Claude and Codex roots, when repo material is created, setup creates `profile.default` and infers adapter targets from discovered roots.
- AE5. **Covers R19, R20, R21, R23, R25, R26.** Given the user chooses live rewrite after import, when setup prepares mutation, it shows backups, dry-run changes, and the exact fingerprint, and it mutates only after the user enters that fingerprint.
- AE6. **Covers R22, R24, R27.** Given `~/.agents` is selected as a target, when live rewrite runs, setup backs up that selected root, rewrites only generated-owned paths, verifies the result, and leaves rollback guidance.
- AE7. **Covers R28, R29, R30.** Given a user runs `agent-brain import` or `agent-brain plan` without source flags, when the command fails, the message points them to `agent-brain setup` and explains how setup can discover sources.

---

## Success Criteria

- A solo user can install Agent Brain, run `agent-brain setup`, and reach an organized `~/.agent-brain` repo without knowing expert flags.
- Setup recognizes visible app roots, symlinked backing roots, dotstate-style source topology, and installer targets such as `~/.agents`.
- A low-confidence discovery result still teaches the user what was found, what was skipped, and what requires review.
- Same-machine live rewrite remains safe: no mutation happens without backup evidence, generated-owned scope, dry-run review, exact fingerprint confirmation, verification, and rollback guidance.
- Downstream planning can turn this document into implementation work without changing the agreed product behavior.

---

## Scope Boundaries

- Do not replace entire live app roots.
- Do not import secrets, auth stores, runtime histories, caches, machine-local overrides, or unknown-risk files by default.
- Do not add a `--yes` or unattended shortcut for live root mutation.
- Do not require item-by-item review for the first import flow.
- Do not make team, shared-profile, or organization-managed workflows the primary first version.
- Do not build a GUI or hosted setup service for this requirement.
- Do not remove expert command workflows.
- Do not guarantee perfect discovery of every possible agent ecosystem in the first version; require an extensible framework with the listed initial surfaces.

---

## Key Decisions

- Setup is the friendly entrypoint: `agent-brain setup` should be the default path for humans, while expert commands stay explicit for automation and advanced use.
- Full migration assistant: setup may guide a user from discovery through import and optional live rewrite in one session.
- General discovery framework: the first version should not be limited to Claude and Codex roots; it must include `~/.agents` and be extensible.
- Symlink-aware by default: setup should follow symlinks read-only and explain dotstate-style backing architecture before asking for import approval.
- Default repo: `~/.agent-brain` is the standard solo-user destination.
- Default profile: initial setup should create `profile.default` and infer adapter targets instead of asking the user to model profiles up front.
- Simple import confirmation: users approve an understandable summary, not a giant per-file checklist.
- Generated-owned rewrite only: live app roots can be updated from Agent Brain output, but unknown, native, runtime, and machine-local material must stay untouched.
- Fingerprint confirmation stays mandatory: live mutation requires exact dry-run fingerprint entry and must not be bypassed by `--yes`.

---

## Dependencies / Assumptions

- Agent Brain's existing dry-run fingerprint, baseline snapshot, verification, and rollback model remains the authority for live mutation safety.
- Adapter ownership rules can define generated-owned paths narrowly enough for selected live target roots.
- `~/.agent-brain` is an acceptable default repo path for solo-user onboarding.
- Discovery can inspect symlink targets read-only without treating those targets as safe to mutate.
- `~/.agents` may act as a source, target, or installer-managed surface depending on local setup, so setup must classify it carefully.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R9, R10][Technical] Decide how discovered visible paths, real paths, and source-control backing evidence should be represented in canonical provenance.
- [Affects R11][Technical] Decide the initial detector contract for dotstate, chezmoi, stow, bare-git, home, and future source types.
- [Affects R22, R24][Technical] Define generated-owned path rules for `~/.agents` before allowing rewrite there.
- [Affects R3, R15][Product] Decide how setup should handle an existing `~/.agent-brain` repo with uncommitted changes or conflicting contents.
- [Affects R28, R29, R30][UX] Decide the exact wording and JSON behavior for expert-command hints.
