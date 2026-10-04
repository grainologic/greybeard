// High-precision AI-tell detector for the writing axis.
//
// Finding-only: a passing scan returns [] and the caller appends nothing, so the model never gets a clean signal to game.
// Precision over recall. A false positive costs the model a turn and teaches it to distrust the channel.
// Detected here: glyph and token signatures, full multi-word templates, and one word-count ceiling.
// A rule enters this file only if its correction can be stated unconditionally.
// Everything else stays steering-only, where the standard still forbids it absolutely.
//
// Each id is a rule name in standards/writing.md, lowercased and hyphenated. That is the only coupling between the files.

const CODE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;

// Drop fenced blocks and inline code spans, leaving the prose.
// Backticked and fenced text is exempt, which is how a document names what these rules ban without tripping them.
// Indented code blocks are not exempt.
const proseOnly = (text: string) =>
  text
    .split(CODE)
    .filter((_, i) => i % 2 === 0)
    .join("");

// Hand-tuned list, the tuning knob. Widen or trim here.
// writing.md names a sample and says the sample is not a boundary, so this array is the enforcement set.
const VOCAB = [
  "delve", "delved", "delving", "tapestry", "testament", "meticulous",
  "meticulously", "underscore", "underscores", "underscoring", "nestled",
  "boasts", "showcasing", "intricate", "intricacies", "pivotal", "vibrant",
  "crucial", "crucially", "landscape", "landscapes",
];
const VOCAB_RE = new RegExp(`\\b(?:${VOCAB.join("|")})\\b`, "gi");

// Full templates. A phrase is safer to match than a word: what is left is quotation and code, both dropped above.
const TEMPLATES: { id: string; re: RegExp; fix: string }[] = [
  {
    id: "inflated-significance",
    re: /\b(?:stands as a testament|plays a (?:pivotal|key|major|crucial) role|reflects a broader|leaves a lasting legacy)\b/gi,
    fix: "State the fact; cut the claim about its weight.",
  },
  {
    id: "announcing-reflexes",
    re: /\b(?:it(?:'s| is) (?:important|worth) (?:to note|noting)|please note|great question)\b/gi,
    fix: "Delete the lead-in and state the fact.",
  },
  {
    id: "performed-enthusiasm",
    re: /\bas an ai\b/gi,
    fix: "Delete it; state what is, with the location.",
  },
];

export interface Tell {
  id: string; // a rule name in writing.md, lowercased and hyphenated
  text: string; // what matched
  sentence: string; // the offending sentence, for context
  fix: string; // the correction to apply
}

// Naive split, used only to show context.
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const clip = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n - 1)}\u2026` : s);

// Only plain prose blocks count. A list, table, quote, heading, or rule is not a paragraph.
const PARAGRAPH_WORDS = 250;
const NOT_PARAGRAPH = /^\s*(?:[-*+]|\d+[.)]|>|#|\||=|~)/;

function paragraphTells(prose: string): Tell[] {
  const out: Tell[] = [];
  for (const block of prose.split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (!lines.length || lines.some((l) => NOT_PARAGRAPH.test(l))) continue;
    const words = block.match(/\S+/g)?.length ?? 0;
    if (words <= PARAGRAPH_WORDS) continue;
    out.push({
      id: "padding-structure",
      text: `${words}-word paragraph`,
      sentence: clip(block.replace(/\s+/g, " ").trim(), 160),
      fix: `Split it; no paragraph runs past ${PARAGRAPH_WORDS} words.`,
    });
  }
  return out;
}

export function findTells(text: string): Tell[] {
  const prose = proseOnly(text);
  const out: Tell[] = [];
  const seen = new Set<string>();
  // One finding per rule and matched text across the whole file. The model needs the rule once.
  const push = (t: Tell) => {
    const key = `${t.id}\u0000${t.text}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  for (const s of sentences(prose)) {
    // Template spans, so a vocabulary hit inside a matched template is not reported twice.
    const spans: [number, number][] = [];
    for (const t of TEMPLATES) {
      t.re.lastIndex = 0;
      for (const m of s.matchAll(t.re)) {
        spans.push([m.index, m.index + m[0].length]);
        push({ id: t.id, text: m[0].toLowerCase(), sentence: s, fix: t.fix });
      }
    }
    const inSpan = (i: number) => spans.some(([a, b]) => i >= a && i < b);

    if (s.includes("\u2014")) {
      push({
        id: "em-dash",
        text: "\u2014",
        sentence: s,
        fix: "Restructure with a period, comma, colon, or parentheses; do not swap the glyph.",
      });
    }
    for (const m of s.matchAll(VOCAB_RE)) {
      if (inSpan(m.index)) continue;
      push({ id: "ai-vocabulary", text: m[0].toLowerCase(), sentence: s, fix: "Use the plain word." });
    }
  }

  return [...out, ...paragraphTells(prose)];
}

// The note appended to the model's own write result: evidence to fix this turn, not a gate.
// Silence appends nothing. Each line carries its own fix, so no line can name a rule that did not fire.
export function formatTells(tells: Tell[]): string {
  const lines = tells.map((t) => {
    const what = t.text === t.id ? "" : `"${t.text}" `;
    return `- ${t.id} ${what}: "${clip(t.sentence)}" -> ${t.fix}`;
  });
  return [
    "greybeard: this prose reads as machine-written (writing standards). Fix each and re-save before finishing:",
    ...lines,
  ].join("\n");
}
