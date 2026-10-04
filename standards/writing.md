# Writing standards

## The test

Two questions decide a sentence. All puffery fails it.

**What does it answer?** A sentence only earns its place by adding a fact, a decision, a reason, a limit, a step, or a transition the reader needs. If all it adds is that the paragraph sounds finished, don't write it. Cut it.

**Would anyone say it?** Read the draft aloud in your head and cut whatever no one would say out loud.

Every rule here applies to every sentence at once. They are not a sequence of passes, and satisfying one does not excuse another. When rules conflict, accuracy and implied meaning win. Never keep a restatement by calling it completeness.

**Write for fast retrieval with no consequential ambiguity.** Answer first, then the reasoning, only if required. Usually, there are no caveats. If there are, caveats sit next to the claim they qualify and not in a coda. Do not hand-hold: let the reader infer connective tissue that costs nothing if they guess wrong. Spell out referents, conditions, and consequences only where a wrong guess changes what they do next.

## Shape follows the reader's need

Decide what the reader came to do, then build for that need and no other.

- **Learn.** A guided path that works on the first try. No branching options, no exhaustive detail, no concept lesson stalling the lesson.
- **Accomplish.** The steps to a correct result. Prerequisites named up front. Nothing that interrupts the task to teach.
- **Look up.** An accurate, structured account of what is. Scannable, with no narrative threaded through it.
- **Understand.** Why the pieces fit and how. No step list pretending to be an explanation.

One document serving more than one need serves none. Split it and link the halves.

## AI Slop

These are the marks that make prose read as machine-written. A reader who spots one stops reading the argument and starts reading the generator, and every other claim in the document loses its weight fatally.

Every rule below is absolute. There is no allowance and no defense. Correct grammar is not one either. All of these are correct English and all are banned. Do not weigh how often a human would write them, because the rule does not rest on that. Do not argue that your sentence is the exception. Scan what you wrote and cut every one you find.

### Marks

**Em-dash.** Never use it, and never fake it with `--`. The dash-and-aside sentence is the tell, not the glyph. Restructure with a period, comma, colon, parentheses, or a trivially scannable sentence.

```diff
--   The cache is fast - and it is - but it lies about freshness.
++  The cache is fast but don't trust it to be fresh.
```

**Keyboard marks.** Straight quotes, never curly. `->` never `→`. `<=` never `≤`. No emoji as ornament. Where the keyboard has the mark, use it. Where it does not, remove it. Never substitute a lookalike.

### Words

**AI vocabulary.** `delve`, `boasts`, `tapestry`, `testament`, `intricate`, `pivotal`, `crucial`, `meticulous`, `underscore`, `vibrant`, `nestled`, `landscape`, `showcasing`, and every inflection of each. Use the plain word. This list is a sample, not a boundary. A word that reads as generated is banned whether or not it appears here.

**Deprecated terms.** Write the right-hand term, never the left. `whitelist` -> `allowlist`. `blacklist` -> `denylist` or `blocklist`. `master` beside `slave` -> `main`, `primary`, or `controller`. `man hours` -> `labor hours`. Generic `he or she` -> `they`. This list is a sample, not a boundary.

**Plain verb.** `serves as`, `stands as`, `functions as`, and `features` almost always mean *is* or *has*. Write the plain verb.

**Inflated significance.** Cut `stands as a testament`, `plays a pivotal role`, `reflects a broader`, `leaves a lasting legacy`. State the fact, not its supposed weight.

```diff
--   The retry logic plays a pivotal role in reliability.
++  A retry turns a transient 503 into a completed request.
```

**Puffery.** `vibrant`, `rich`, `renowned`, `groundbreaking`, `nestled`, `in the heart of`, `guru`, `ninja`, `rockstar`, `evangelist`. Neutral description, not a brochure.

**Vague attribution.** `Experts argue`, `observers note`, `industry reports`, `some critics`. Name the source or cut the claim.

### Sentences

**Announcing reflexes.** `Certainly`, `Great question`, `I hope this helps`, `It's important to note`, `please note`, `In conclusion`, `Let me know`. A sentence whose only job is announcing gets deleted, not softened.

**Negative parallelism.** Cut `it's not just X, it's Y`, `not only X but also Y`, and `from X to Y`. State the point. A contrast that matters survives being stated directly.

**Reflexive triads.** `fast, reliable, and scalable` reads as generated. Write the properties that are true, however many there are.

**Hedging stacks.** One hedge per claim. `may possibly`, `could potentially`, `it seems likely that`: pick one, or commit to the claim.

**Performed enthusiasm.** No exclamation marks in technical text. No `as an AI`. No work narration such as `I've added error handling`. State what is and where it is. First person belongs in conversation, not in artifacts.

### Structure

**Padding structure.** Do not restate the heading as the first sentence. No `in this document we will`. No summary that re-says a short text. No one-item lists. No paragraph past 250 words. A section with nothing to say gets one honest line, never filler.

**Summary coda.** Do not repeat the answer after the answer. A closing that names a consequence or the next action earns its place. A closing that restates does not.

**Bullet reflex.** Reach for prose first. A list is for genuinely enumerable items: steps, options, scan targets. Connected reasoning stays prose. A bold label followed by a colon is a tell when the label adds nothing the sentence could not carry.

**Formatting.** One sentence is not five bullets. A table is for enumerable facts. Headings are sentence case, not Title Case. Bold marks a term the reader must not miss, not emphasis you felt like adding.

## What brevity never cuts

NEVER SACRIFICE clarity, accuracy, or completeness of meaning to save words. Brevity to the point of obfuscation is its own cognitive load.
