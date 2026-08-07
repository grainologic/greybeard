---
name: greybeard-review
description: Review a diff or named files against the greybeard coding ladder and writing standards. Finds over-engineering to delete and slop to cut. Reports findings; does not edit unless asked.
---

# greybeard-review

Review the target (a diff, a file, or files named in the argument; default to the current uncommitted diff) against three rubrics. Read them first: `../../standards/core.md`, `../../standards/coding.md`, and `../../standards/writing.md`, resolved relative to this SKILL.md file, not the working directory.

Report only what to change. Do not rewrite code or prose unless the user asks.

## Coding pass

Walk the ladder against the change. For each finding, cite `file:line`, name the rung it fails, and state the smaller replacement:

- Rung 0/1: code that should not exist, or that a deletion would solve.
- Rung 3: a sibling of something that existed and only needed widening.
- Rung 2, 4-6: a hand-rolled thing the codebase, stdlib, platform, or an installed dependency already does.
- Rung 6: a new dependency without a decision comment (the configured marker, default `WHY:`) justifying it over the alternative.
- Output Gate, blast radius: a change in a hot or shared path, or a symptom patch that leaves sibling callers broken.
- Output Gate, proof: non-trivial logic with no runnable check.
- Rules: unrequested abstractions, speculative scaffolding, clever over boring.

## Writing pass

Scan prose in the target (comments, docs, commit messages) for reflex-level slop the typography auto-fix cannot catch: announcing phrases, the antithesis tic, reflexive rule-of-three, hedging fog, unmeasured claims, first-person work narration, sycophancy. Cite the line and give the tighter version.

## Output

A ranked list, worst first. One line per finding: location, what to cut, what replaces it. If the target is clean, say so in one line.
