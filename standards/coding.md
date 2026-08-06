# Coding standards

## The Ladder

Understand the problem before climbing: read the task and the code it touches, trace the real flow end to end. Then take the rungs in order and stop at the first that holds. If two rungs work, take the higher and move on.

**Gate: should this exist?**

0. Avoid it. Kill it, defer it, or push back with the reason. The best diff is the one you talked the requester out of. (YAGNI)

**Construction: how little?**

1. Subtract code. If removing code, config, or a feature solves it, remove it. A net-negative diff wins outright.
2. Reuse what this codebase already has: the helper, the pattern, the type. Write fresh only when the trivial write costs less than the coupling. (DRY)
3. Widen what almost works. Code one parameter short of the job gets the parameter. A sibling function beside it is a fork you maintain twice. Widen to the case in hand, never to a class of cases.
4. Use the stdlib. (NIH)
5. Use the native platform feature. (NIH)
6. Use the installed dependency. A *new* dependency is a design decision, not a rung: stop and justify it in a comment (see Rules).
7. If one line does it, ship the line.
8. Write the minimum code that works. (KISS)

## Output Gate

Every change leaves through all three, whatever rung built it.

- **Blast radius.** Count the callers, weigh reversibility, respect trust boundaries. A one-liner in a hot shared path is risk, not laziness.
- **Proof.** Run the cheapest check that exercises what you changed, including the malformed input the touched boundary can receive. No check means unfinished.
- **Report.** Code first, then at most three short lines: what changed, what was skipped, when to add it (`did X; skipped Y, add when Z`). Y is never a never-cut item. No essays, feature tours, or design notes. If the explanation outweighs the diff, cut the explanation: a paragraph defending a simplification is complexity smuggled back as prose.

## Rules

- **No unrequested abstractions.** No interface with one implementation, no factory for one product, no config for a value that never changes.
- **No speculative scaffolding.** Build today's requirement; later can scaffold for itself.
- **Deletion over addition.** Boring over clever: clever is what someone decodes at 3am.
- **Shortest working diff, fewest files.** The smallest change in the wrong place is a second bug, not a fix.
- **Root cause, not symptom.** A report names a symptom. Grep every caller of the function you touch and fix it once at the shared point; patching only the named path leaves sibling callers broken.
- **Edge-case-correct beats flimsy.** Between two same-size options, take the one right on the edges. Lazy means less code, not a weaker algorithm.
- **Do not convert.** Working hand-rolled code gets extended in its own style. Swapping it for a framework or library (argparse for a working argv loop, a picker lib over `<input type="date">`, app code over a DB constraint) is a rewrite nobody asked for.
- **The ask defines the diff.** An improvement you noticed next door is one line in the report, never a change in the diff.
- **Default, don't stall.** An ambiguous ask gets the lazy reading shipped and questioned in the same response: `did X; Y covers it; say so if you need full X`. Never block on an answer you can default.
- **YAGNI applies to tests.** One runnable check per change. No framework or fixtures.
- **Comment every non-obvious ladder decision.** Obvious choices stay silent. For the rest (a new dependency over stdlib, reuse over rewrite, a corner cut with a known ceiling) name what you chose and the alternative you rejected; for a shortcut, name the ceiling and the upgrade path. {{marker_line}}

## What laziness never cuts

NEVER SIMPLIFY AWAY: input validation at trust boundaries, error handling that prevents data loss, security, accessibility basics, hardware calibration, and anything a task explicitly requires. Understanding is never optional: a small diff you do not understand is laziness dressed up as efficiency.
