// High-precision AI-tell detector for the writing axis.
//
// Finding-only. Returns the tells worth interrupting the model's own turn to fix,
// and nothing else. A passing scan returns [] and the caller appends nothing, so
// the model never gets a "clean" signal to game: the mechanical floor is not a
// ceiling, and the writing standard in steering is the real governor.
//
// Deliberately narrow, precision over recall. Only tells that (a) are unmistakable
// and (b) are not safe auto-substitutions: the em-dash needs the sentence
// restructured (a glyph swap just reproduces the tell), and the vocabulary cluster
// needs a judgment-call synonym in context. Typography that IS a safe substitution
// (emoji, tight en-dash, curly quotes) is fixed silently in typography.ts and never
// reaches here. Judgment rungs (inflated significance, weasel attribution) stay
// steering-only: flagging those mechanically would cry wolf inside the model's turn.

const CODE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;

// Hand-tuned list, the tuning knob. Words almost never the right choice in factual
// or technical prose. Widen or trim here; a false positive costs more than a miss,
// because each one interrupts the model mid-turn over prose that was fine.
const VOCAB = [
  "delve", "delved", "delving", "tapestry", "testament", "meticulous",
  "meticulously", "underscore", "underscores", "underscoring", "nestled",
  "boasts", "showcasing", "intricate", "intricacies", "pivotal", "vibrant",
];
const VOCAB_RE = new RegExp(`\\b(?:${VOCAB.join("|")})\\b`, "gi");

export interface Tell {
  rung: number; // writing.md Anti-AI-slop rung
  kind: string; // human label, e.g. "em-dash" or 'vocab "delve"'
  sentence: string; // the offending sentence, for context
}

// Prose only: drop fenced blocks and inline code, then split into naive sentences.
function sentences(text: string): string[] {
  return text
    .split(CODE)
    .filter((_, i) => i % 2 === 0)
    .join("")
    .split(/(?<=[.!?])\s+|\n+/) // naive split, good enough to show context
    .map((s) => s.trim())
    .filter(Boolean);
}

export function findTells(text: string): Tell[] {
  const out: Tell[] = [];
  for (const s of sentences(text)) {
    if (s.includes("\u2014")) out.push({ rung: 1, kind: "em-dash", sentence: s });
    const hit = new Set<string>();
    for (const m of s.matchAll(VOCAB_RE)) {
      const w = m[0].toLowerCase();
      if (hit.has(w)) continue;
      hit.add(w);
      out.push({ rung: 3, kind: `vocab "${w}"`, sentence: s });
    }
  }
  return out;
}

const clip = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n - 1)}\u2026` : s);

// The note appended to the model's own write result: evidence to fix this turn,
// not a gate. Silence (no tells) appends nothing; there is no "clean" message.
export function formatTells(tells: Tell[]): string {
  const lines = tells.map((t) => `- rung ${t.rung} ${t.kind}: "${clip(t.sentence)}"`);
  return [
    "greybeard: this prose reads as machine-written (writing standards). Fix each and re-save before finishing:",
    ...lines,
    "Restructure the sentence to drop the em-dash (do not swap the glyph); replace cluster vocabulary with the plain word.",
  ].join("\n");
}
