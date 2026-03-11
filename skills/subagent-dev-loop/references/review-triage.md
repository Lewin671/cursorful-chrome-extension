# Review Triage

Use this reference to merge three independent review outputs into issue groups.

## Shared Problem Heuristic

Count findings as the same underlying problem when they overlap on the defect, not necessarily on the wording.

Typical matches:

1. Two reviewers say the same branch can throw or return the wrong value.
2. One reviewer flags missing cleanup and another flags the resulting leak or duplicate listener.
3. Two reviewers identify the same missing test coverage for the same failure mode.

Do not merge findings only because they touch the same file. Distinct defects in one file stay separate.

## Severity Heuristic

Escalate even a single-reviewer finding when it is concrete and high impact:

1. User-visible breakage in the main flow.
2. Incorrect persistence, export, or destructive behavior.
3. Security, permission, or privacy mistakes.
4. Failing tests tied to the change.

Leave low-confidence speculation out of the next iteration unless another reviewer independently reinforces it.

## Aggregation Output Format

Summarize reviewer feedback in three buckets:

1. Accepted shared issues.
2. Accepted severe singleton issues.
3. Non-blocking singleton notes.

Feed only the accepted issues back into the next coding pass.
