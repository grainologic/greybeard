// Repeated-failure detector: the backstop against grinding one dead approach.
//
// Counts failed tool calls per target and returns a verdict on the third. The
// target is the anchor rather than the command, because a rabbit hole keeps the
// file and swaps the tool around it.

const FIRE_EVERY = 3; // failures on one target between notes
const MAX_NOTES = 2; // per target per run
const ESCALATION = 1.5; // command grown this far past its first failed version

// Shell separators: only the first segment carries the attempt's operand.
const SEPARATOR = /\s(?:\|\||&&|;|\||>>|>|<)\s|\s(?:\|\||&&|;|\||>>|>|<)$/;

export interface ChurnVerdict {
  target: string;
  failures: number;
  escalating: boolean;
}

interface Entry {
  failures: number;
  firstLength: number;
  notes: number;
}

export type ChurnState = Map<string, Entry>;

const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const PATH_LIKE = /[\\/]|\.[A-Za-z0-9]{1,8}$/;

export function signature(toolName: string, input: { path?: string; command?: string }): string {
  const path = input.path?.trim();
  if (path) return path.toLowerCase();

  const cmd = input.command?.trim();
  if (!cmd) return toolName.toLowerCase();

  const operands = (cmd.split(SEPARATOR)[0].match(/"[^"]*"|'[^']*'|\S+/g) ?? [])
    .map((t) => t.replace(/^["']+|["']+$/g, ""))
    .filter((t) => t && !t.startsWith("-") && !ENV_ASSIGNMENT.test(t));
  const paths = operands.filter((t) => PATH_LIKE.test(t));
  const anchor = paths.length ? paths[paths.length - 1] : operands[0];
  return (anchor ?? toolName).toLowerCase();
}

// Returns a verdict on the third failure against a target, and again on the sixth.
export function recordFailure(state: ChurnState, sig: string, commandLength = 0): ChurnVerdict | undefined {
  const e = state.get(sig) ?? { failures: 0, firstLength: commandLength, notes: 0 };
  e.failures++;
  state.set(sig, e);

  if (e.notes >= MAX_NOTES || e.failures % FIRE_EVERY !== 0) return undefined;
  e.notes++;
  return {
    target: sig,
    failures: e.failures,
    escalating: e.firstLength > 0 && commandLength >= e.firstLength * ESCALATION,
  };
}

// The note appended to the failing tool result.
export function formatChurn(v: ChurnVerdict): string {
  const lines = [
    `greybeard: ${v.failures} failures on \`${v.target}\`. The approach is spent.`,
    "Repeated failure against one target measures the route, not the input: another variant of the same command buys nothing.",
    "Say what the failures prove, then take a different route or report the block.",
  ];
  if (v.escalating) {
    lines.push("This command is longer than the first one that failed. Growing a failing command is the expensive way to be wrong.");
  }
  return lines.join("\n");
}
