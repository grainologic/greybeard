---
name: greybeard-audit
description: Whole-repo scan for over-engineering and slop against the greybeard standards. Produces a ranked list of what to delete, simplify, or tighten. One-shot report, applies no fixes.
---

# greybeard-audit

Scan the whole repository against `../../standards/coding.md` and `../../standards/writing.md`, resolved relative to this SKILL.md file, not the working directory. Unlike greybeard-review, this reads the codebase rather than a diff, so it will miss nothing to a read window but must stay ruthless about ranking.

## What to hunt

- **Reinvented wheels:** code the stdlib, platform, or an already-installed dependency covers (rungs 3-5).
- **Speculative generality:** interfaces with one implementation, factories for one product, config for constants, dead flexibility nothing calls.
- **Deletable surface:** files, exports, options, and branches with no live caller. A net-negative diff is the best diff.
- **Unjustified dependencies:** entries in the manifest with no use site, or heavy dependencies pulled in for a few lines.
- **Slop in human-facing text:** READMEs and docs that pad, hedge, or make unmeasured claims.

## Output

A ranked list, highest payoff first. Each row: path (and line where it helps), the problem, the concrete action (delete / replace with X / inline / tighten). End with the three changes that remove the most code for the least risk. Apply nothing.
