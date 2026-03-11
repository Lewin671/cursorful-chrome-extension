---
name: subagent-dev-loop
description: Coordinate implementation through subagents instead of coding directly. Use when requirements are already clarified and the user wants a structured loop with 1 coding subagent, 3 independent review subagents, and iterative fixes until no shared review issues remain. Best for non-trivial code changes, bug fixes, refactors, or feature work where parallel review and convergence discipline matter more than raw speed.
---

# Subagent Dev Loop

## Overview

Drive delivery through a repeatable subagent loop: one worker implements, three reviewers inspect independently, and the main agent aggregates feedback into another implementation pass only when the feedback clears the convergence bar.

Keep the main agent responsible for orchestration, scope control, review triage, and final verification. Keep code-writing ownership with the coding subagent unless there is a narrow reason to patch locally.

## Preconditions

Confirm the request is implementation-ready before spawning workers.

Do this first:

1. Restate the requirement, constraints, and acceptance target in one compact brief.
2. Inspect the codebase enough to identify likely files, tests, and risks.
3. Resolve ambiguous requirements before implementation when the ambiguity is material.
4. Decide the immediate blocking work that must stay on the main thread.

Do not start the loop when the task is still exploratory, the user is only brainstorming, or the acceptance criteria are too vague to review meaningfully.

## Implementation Loop

### Step 1: Create the coding brief

Write a concrete handoff for one worker subagent.

Include:

1. The exact behavior to implement or fix.
2. Expected files or ownership boundaries.
3. Required tests or verification commands.
4. Constraints such as preserving existing patterns, not reverting unrelated changes, and coexisting with edits from other agents.

If the task spans multiple unrelated areas, split it into sequential worker tasks instead of one vague assignment.

### Step 2: Spawn one coding subagent

Use one `worker` subagent to implement the change.

In the prompt:

1. Assign ownership over the relevant files or module boundary.
2. State that other agents may also be active and the worker must not revert unrelated edits.
3. Ask for a concise completion report with changed files, test results, and known risks.

Keep the main agent moving while the worker runs by gathering verification context or preparing likely review prompts.

### Step 3: Review only after code exists

Once the worker returns code, spawn three independent review subagents.

Use review prompts that:

1. Ask for findings first, ordered by severity.
2. Focus on bugs, regressions, missing tests, and integration risks.
3. Require file and line references where possible.
4. Do not reveal other reviewers' opinions before they finish.

Keep the reviewers independent. Independence matters more than giving each reviewer a different theme. If useful, bias them lightly:

1. Reviewer A: correctness and regressions.
2. Reviewer B: edge cases and tests.
3. Reviewer C: integration and maintainability risks.

## Review Aggregation

After all three reviews finish, normalize the feedback into issue groups. Use [review-triage.md](./references/review-triage.md) when the overlap is not obvious.

Treat an issue as a shared problem when at least two reviewers independently point to the same underlying defect, even if they phrase it differently or cite nearby lines.

Also treat a single finding as iteration-blocking when it is obviously severe on its own, such as:

1. Data loss or corrupted state.
2. Security or privacy exposure.
3. Broken core behavior.
4. Test failures or a reproducible crash.

Do not keep looping on isolated style preferences, speculative refactors, or one-off subjective comments unless they expose a concrete defect.

## Iteration Rule

Run another implementation pass when there is at least one shared problem or one clearly severe single-reviewer finding.

For each new iteration:

1. Summarize only the accepted issues.
2. Send that narrower fix brief to the coding subagent.
3. Re-run the three-reviewer pass on the updated result.
4. Re-test any affected behavior.

Prefer reusing the same coding subagent thread if the context is still relevant. Spawn a fresh worker only when the thread has drifted or the ownership boundary changes.

## Stop Condition

Stop iterating when both are true:

1. No issue is reported by two or more reviewers as the same underlying problem.
2. No remaining single-reviewer finding is obviously severe enough to block release.

At that point, call out any residual singleton notes as non-blocking and move to final verification.

## Final Verification

Before closing:

1. Inspect the final diff.
2. Run the relevant tests or verification commands yourself when feasible.
3. Confirm whether the implementation meets the original acceptance target.
4. Report residual risks, especially when browser-only or manual flows could not be fully exercised.

## Response Pattern

Use a compact orchestration rhythm in the main thread:

1. Confirm requirement readiness.
2. Announce the coding subagent assignment.
3. Announce the three-review pass.
4. Summarize accepted findings and whether another loop is required.
5. Finish with verification status and any remaining non-blocking risks.

## Example Triggers

These requests should trigger this skill:

1. "Confirm the plan, then let a subagent implement it and have three subagents review it."
2. "Use a worker to code this and iterate until the reviewers stop finding the same issue."
3. "I want a multi-agent implementation loop instead of direct edits by the main agent."
