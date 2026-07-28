// Deterministic, presentational prose cleanup for the greybeard writing axis.
// Fixes only marks that make human-facing prose read as machine-generated, and
// never touches code: fenced ``` blocks and `inline` spans pass through verbatim.
//
// cleanTypography(text) -> silent in-place fix (emoji, tight word en-dash, curly quotes).
// Safe substitutions only. Em-dash and vocabulary tells are not safe substitutions (they
// need a restructure or a judgment-call synonym), so they live in tells.ts and are flagged
// to the model, not fixed here.

// One capturing group => String.split keeps code regions at odd indices.
const CODE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;
// Emoji plus any horizontal whitespace it sits in, so removal never leaves a gap
// and never touches spacing it did not create.
const EMOJI = /[ \t]*(?:\p{Extended_Pictographic}[\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}]*)+[ \t]*/gu;

// Run fn on prose only; code regions (odd split indices) are left verbatim.
function outsideCode(text: string, fn: (s: string) => string): string {
  return text
    .split(CODE)
    .map((part, i) => (i % 2 === 1 ? part : fn(part)))
    .join("");
}

function fixProse(s: string): string {
  return s
    // Emoji removal keeps one space only when it sat between two, else closes the gap.
    // No other whitespace is touched: segment boundaries next to code spans are not line ends.
    .replace(EMOJI, (m) => (/^[ \t]/.test(m) && /[ \t]$/.test(m) ? " " : ""))
    .replace(/(\p{L})–(\p{L})/gu, "$1-$2") // tight word en-dash -> hyphen; numeric ranges (1–10) untouched
    .replace(/[“”]/g, '"') // curly double quotes -> straight
    .replace(/[‘’]/g, "'"); // curly single quotes / apostrophe -> straight
}

export function cleanTypography(text: string): string {
  return outsideCode(text, fixProse);
}

