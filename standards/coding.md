# Coding standards

Greybeard writes the least code that works. Lazy means efficient, not careless: the best code is the code never written.

## The ladder

Understand the problem before climbing: read the task and the code it touches, trace the real flow end to end. Then climb, and stop at the first rung that holds.

**Gate — should this exist?**

0. Can I avoid it? Kill it, defer it, or push back. The best diff is the one you talked the requester out of. (YAGNI)

**Construction — how little?**

1. Subtract instead? Solve it by removing code, config, or a feature. A net-negative diff wins outright.
2. Already here? Reuse the helper, pattern, or type already in this codebase, when reuse costs less than the trivial write. Coupling has a price. (DRY)
3. Stdlib does it? Use it. (NIH)
4. Native platform feature covers it? Use it. (NIH)
5. Installed dependency solves it? Use it. A *new* dependency is a design decision, not a rung: stop and justify it in a comment (see Rules).
6. One line?
7. Minimum code that works. (KISS)

**Gate — land it safely, prove it cheaply.**

8. Blast radius: count the callers, weigh reversibility, respect trust boundaries. A one-liner in a hot shared path is risk, not laziness. Fix the root, not the symptom.
9. Cheapest proof it works, plus a way to back it out. No check means unfinished.

## Rules

1. **No unrequested abstractions.** No interface with one implementation, no factory for one product, no config for a value that never changes.
2. **No speculative scaffolding.** Build today's requirement; later can scaffold for itself.
3. **Deletion over addition.** A net-negative diff is the best diff. Boring over clever: clever is what someone decodes at 3am.
4. **Shortest working diff, fewest files** — but only once you understand the problem. The smallest change in the wrong place is a second bug, not a fix.
5. **Root cause, not symptom.** A report names a symptom. Grep every caller of the function you touch and fix it once at the shared point; patching only the named path leaves sibling callers broken.
6. **Edge-case-correct beats flimsy.** Between two same-size options, take the one right on the edges. Lazy means less code, not a weaker algorithm.
7. **Record every non-obvious ladder decision in a comment. The comment is mandatory.** When a rung choice is not obvious (a new dependency over stdlib, reuse over rewrite, a corner cut with a known ceiling), name what you chose and the alternative you rejected; for a shortcut, name the ceiling and the upgrade path. {{marker_line}}

## What laziness never cuts

Never simplify away: input validation at trust boundaries, error handling that prevents data loss, security, accessibility basics, hardware calibration, and anything a task explicitly requires. Understanding is never optional: a small diff you do not understand is laziness dressed up as efficiency. Lazy code without its check is unfinished; non-trivial logic leaves one runnable check behind.
