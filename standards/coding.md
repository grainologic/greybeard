# Coding standards

## The Ladder

Understand the problem before climbing: read the task and the code it touches, trace the real flow end to end. Then take the rungs in order and stop at the first one that holds. Every rung you pass means the previous one did not hold. If two rungs work, take the higher, move on.

**Gate: should this exist?**

0. Avoid it. Kill it, defer it, or push back with the reason. The best diff is the one you talked the requester out of. (YAGNI)

**Construction: how little?**

1. Subtract code. If removing code, config, or a feature solves it, remove it. A net-negative diff wins outright.
2. Reuse what this codebase already has: the helper, the pattern, the type. Write fresh only when the trivial write costs less than the coupling. (DRY)
3. Use the stdlib. (NIH)
4. Use the native platform feature. (NIH)
5. Use the installed dependency. A *new* dependency is a design decision, not a rung: stop and justify it in a comment (see Rules).
6. If one line does it, ship the line.
7. Write the minimum code that works. (KISS)

## Output Gate

Every change leaves through all three, whatever ladder rung built it.

- **Blast radius.** Count the callers, weigh reversibility, respect trust boundaries. A one-liner in a hot shared path is risk, not laziness.
- **Proof.** Run the cheapest check that
  exercises what you changed, including the malformed input the touched boundary can receive. No check means unfinished.
- **Report.** Code first. Then at most three short lines: what changed, what was skipped, when to add it (`did X; skipped Y, add when Z`) (skipped Y — never a never-cut item). No essays, feature tours, design notes. If the explanation outweighs the diff, cut the explanation. A paragraph defending simplification is complexity masquerading as prose.

## Rules

- **No unrequested abstractions.** No interface with one implementation, no factory for one product, no config for a value that never changes.
- **No speculative scaffolding.** Build today's requirement; later can scaffold for itself.
- **Deletion over addition.** A net-negative diff is the best diff. Boring over clever: clever is what someone decodes at 3am.
- **Shortest working diff, fewest files** — but only once you understand the problem. The smallest change in the wrong place is a second bug, not a fix.
- **Root cause, not symptom.** A report names a symptom. Grep every caller of the function you touch and fix it once at the shared point; patching only the named path leaves sibling callers broken.
- **Edge-case-correct beats flimsy.** Between two same-size options, take the one right on the edges. Lazy means less code, not a weaker algorithm.
- **Extend, don't convert.** Working hand-rolled code gets extended in its own style. Converting it to a framework or library for style (argparse for a working argv loop, a picker lib over `<input type="date">`, app code over a DB constraint) is a rewrite nobody asked for.
- **The ask defines the diff.** An improvement you noticed next door is one line in the report, never a change in the diff.
- **Default, don't stall.** An ambiguous ask gets the lazy reading shipped and questioned in the same response: `did X; Y covers it; say so if you need full X`. Never block on an answer you can default.
- **YAGNI applies to tests.** One runnable check per change. No framework or fixtures.
- **Record every non-obvious ladder decision in a comment.** For an obvious choice, silence is default. For non obvious choices (a new dependency over stdlib, reuse over rewrite, a corner cut with a known ceiling), name what you chose and the alternative you rejected; for a shortcut, name the ceiling and the upgrade path. {{marker_line}}

## What laziness never cuts

NEVER SIMPLIFY AWAY: input validation at trust boundaries, error handling that prevents data loss, security, accessibility basics, hardware calibration, and anything a task explicitly requires. Understanding is never optional: a small diff you do not understand is laziness dressed up as efficiency.
