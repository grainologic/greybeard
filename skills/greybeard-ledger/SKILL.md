---
name: greybeard-ledger
description: Harvest greybeard's decision comments into a ledger, so the choices and deferrals it recorded get tracked instead of rotting. Splits settled decisions from deferred debt and flags debt with no upgrade trigger. One-shot report, changes nothing. Use on "greybeard ledger", "/greybeard-ledger", "greybeard trail", "what did greybeard decide", "list the decisions", "what did we defer".
---

# greybeard-ledger

Greybeard marks every non-obvious ladder decision with a decision comment (coding standards, "comment every non-obvious ladder decision"): a new dependency over stdlib, reuse over rewrite, or a corner cut with a named ceiling. This collects them into one ledger so a deferral cannot quietly become permanent and a rationale is not lost.

## Find the marker

The prefix is configurable. Read `marker` from `.pi/greybeard.json` in the project (fall back to the global `~/.config/greybeard/config.json`, then to the default `WHY:`).

An empty marker means decision comments are still required but carry no prefix, so they cannot be counted. Stop and report: `marker is empty; decisions are unprefixed and uncountable. Set one with /greybeard prefix WHY: to enable the ledger.`

## Scan

Grep the repo for the literal marker in comments, skipping `node_modules`, `.git`, and build output:

`grep -rnE "(#|//|--|/\*) ?WHY:" .`  (replace `WHY:` with the resolved marker; add other comment prefixes if your stack uses them)

Each hit is one ledger row.

## Split by shape

Read each comment and sort it:

- **Debt** — names a ceiling and an upgrade path or trigger ("O(n^2) scan, index if it gets hot"). These are deferrals that must be revisited.
- **Decision** — states a choice and the rejected alternative ("chose pico-args over stdlib arg parsing"), with no trigger. These are settled.

Any comment that names a ceiling but no upgrade trigger gets a `no-trigger` tag: those are the ones that silently rot.

## Output

Two groups, debt first (it is the actionable half). One row each, grouped by file:

`<file>:<line>  <what was chosen or cut>  [ceiling: <limit> | upgrade: <trigger>]`

End with `<N> decisions, <D> deferred, <T> with no trigger.` Nothing found: `No recorded decisions. Empty ledger.`

State the honesty boundary once: this count is a floor, not a census. Dependency choices are reliably marked (greybeard nudges every install); reuse and corner-cut decisions ride the prompt and land only when the model complied.

## Boundaries

Reads and reports only, changes nothing. To persist it, ask and it writes the ledger to a file (e.g. `GREYBEARD-LEDGER.md`). One-shot.
