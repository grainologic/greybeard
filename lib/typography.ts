// Deterministic glyph cleanup for the greybeard writing axis: silent, on disk, zero
// model tokens. One substitution table, two region selectors:
//
//   cleanTypography(text)            prose file, everything outside fenced and inline code
//   cleanSourceComments(text, path)  source file, comment bodies only (lib/comments.ts)
//
// Safe substitutions only. Every entry is a glyph no keyboard types, mapped to the
// keyboard spelling of the same mark (writing.md rung 2: use the mark the keyboard
// has, otherwise remove it, never swap in a lookalike). Nothing here needs judgment,
// so nothing here costs a turn through the model. Tells that do need judgment (the
// em-dash construction, the vocabulary cluster) live in tells.ts and go back to the
// model as findings instead of being fixed.
//
// The em-dash is deliberately absent from the table: the dash-and-aside construction
// is the tell, not the glyph, so substituting it would hide the tell rather than fix
// it. Em-dash lookalikes (horizontal bar, two- and three-em dash) normalize TO the
// em-dash for that same reason, so the detector sees them.
//
// The property that makes the comment path safe: this is a no-op on pure ASCII.
// Nothing here rewrites a character a keyboard types, so a comment scanner that
// misjudges a region can still only change glyphs that had no business being there.
//
// Deliberately not touched: the en-dash in a numeric range (1-10 is a range), single
// fractions (1 1/2 would corrupt), accented letters, and marks with no ASCII spelling
// (degree, section, dagger, currency), because dropping them would drop meaning.
// The (c), (r), and (tm) signs are pictographic, so the emoji rule takes them.

import { mapComments } from "./comments.ts";

// Character classes built from code points, not literals: the marks below are
// invisible, and one of them (the line separator) is a line terminator that a regex
// literal cannot hold at all.
const charClass = (...codePoints: number[]) =>
  new RegExp(`[${codePoints.map((c) => String.fromCodePoint(c)).join("")}]`, "gu");

// One capturing group => String.split keeps code regions at odd indices.
const CODE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;

// Emoji plus any horizontal whitespace it sits in, so removal never leaves a gap
// and never touches spacing it did not create.
const EMOJI = /[ \t]*(?:\p{Extended_Pictographic}[\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}]*)+[ \t]*/gu;

// Zero-width and formatting marks: invisible in the artifact, loud in a diff, and the
// reason a later grep quietly fails to match.
const INVISIBLE = charClass(
  0x00ad, // soft hyphen
  0x180e, // Mongolian vowel separator
  0x200b, // zero-width space
  0x200c, // zero-width non-joiner
  0x200d, // zero-width joiner, left over once the emoji it joined is gone
  0x2060, // word joiner
  0xfe0e, // text presentation selector
  0xfe0f, // emoji presentation selector, same case
  0xfeff, // byte order mark used mid-file
);

// Every exotic space collapses to one plain space, and so do the two Unicode line
// separators: turning a separator into a newline would split a line comment and leave
// its tail standing as code.
const SPACE = charClass(
  0x00a0, // no-break space
  0x1680, // Ogham space mark
  0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, // en quad through four-per-em
  0x2006, 0x2007, 0x2008, 0x2009, 0x200a, // six-per-em through hair space
  0x2028, // line separator
  0x2029, // paragraph separator
  0x202f, // narrow no-break space
  0x205f, // medium mathematical space
  0x3000, // ideographic space
);

// Fullwidth ASCII, the paste signature of CJK-locale editors, maps back by offset.
const FULLWIDTH = /[！-～]/g;

const EM_LOOKALIKE = /[―⸺⸻]/g;
const TIGHT_EN_DASH = /(\p{L})–(\p{L})/gu;

const SUBSTITUTIONS: Record<string, string> = {
  // curly quotes, guillemets, primes
  "‘": "'", "’": "'", "‚": "'", "‛": "'",
  "‹": "'", "›": "'", "′": "'", "‵": "'",
  "“": '"', "”": '"', "„": '"', "‟": '"',
  "«": '"', "»": '"', "″": '"', "‶": '"',
  // hyphens and minus signs that are not the hyphen key
  "‐": "-", "‑": "-", "‒": "-", "−": "-",
  // bullets used as ornament or as a hand-rolled list marker
  "•": "-", "‣": "-", "⁃": "-", "▪": "-", "▫": "-", "◦": "-",
  // arrows with a keyboard spelling
  "→": "->", "←": "<-", "↔": "<->",
  "⇒": "=>", "⇐": "<=", "⇔": "<=>",
  // comparison and arithmetic
  "≤": "<=", "≥": ">=", "≠": "!=", "≈": "~",
  "×": "x", "÷": "/", "±": "+/-", "∗": "*", "⁄": "/",
  // punctuation
  "…": "...",
  // ligatures, the signature of text pasted out of a PDF
  "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi",
  "ﬄ": "ffl", "ﬅ": "st", "ﬆ": "st",
};
const SUBSTITUTE = new RegExp(`[${Object.keys(SUBSTITUTIONS).join("")}]`, "g");

// Per-category tally of the work done, mutated in place when passed. Keys:
// substituted (spelled out or normalized), emoji (sequences removed), invisible
// (marks removed), space (spaces normalized).
export type GlyphTally = Record<string, number>;

// Substitution runs before emoji removal on purpose: a few marks that have a keyboard
// spelling are pictographic too (the bidirectional arrow, the small squares), and
// spelling those out beats deleting them. What survives of an emoji presentation
// sequence afterwards is a bare variation selector, which INVISIBLE clears.
function normalize(s: string, tally?: GlyphTally): string {
  const inc = (k: string) => {
    if (tally) tally[k] = (tally[k] ?? 0) + 1;
  };
  return s
    .replace(SUBSTITUTE, (c) => (inc("substituted"), SUBSTITUTIONS[c]))
    .replace(EM_LOOKALIKE, () => (inc("substituted"), "—"))
    .replace(EMOJI, (m) => (inc("emoji"), /^[ \t]/.test(m) && /[ \t]$/.test(m) ? " " : ""))
    .replace(INVISIBLE, () => (inc("invisible"), ""))
    .replace(SPACE, () => (inc("space"), " "))
    .replace(FULLWIDTH, (c) => (inc("substituted"), String.fromCharCode(c.charCodeAt(0) - 0xfee0)))
    .replace(TIGHT_EN_DASH, (_m, a, b) => (inc("substituted"), `${a}-${b}`)); // "re-run pages 1-10": the numeric range keeps its en-dash
}

// Prose file: clean everything except fenced blocks and inline spans, which are code
// and belong to whoever wrote them.
export function cleanTypography(text: string, tally?: GlyphTally): string {
  return text
    .split(CODE)
    .map((part, i) => (i % 2 === 1 ? part : normalize(part, tally)))
    .join("");
}

// Source file: clean comment bodies only. Identifiers, string literals, and data keep
// every glyph, because there a glyph can be the point.
export function cleanSourceComments(text: string, path: string, tally?: GlyphTally): string {
  return mapComments(text, path, (body) => normalize(body, tally));
}
