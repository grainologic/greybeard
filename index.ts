// A lazy-principal-engineer overlay for pi.
//
// Two axes, toggled independently:
//   code  -> the coding ladder (standards/coding.md) injected as steering
//   prose -> the writing standards (standards/writing.md) injected as steering
//
// Enforcement is deliberately small and soft (nothing blocks the model):
//   - dependency installs get a decision-comment reminder appended to the tool result (steers, does not block)
//   - typography in prose files is auto-fixed on disk (emoji, tight en-dash, curly quotes) with zero model tokens
//   - AI-tells needing judgment (em-dash, vocabulary cluster) are appended to the model's own write result so it self-corrects the same turn: finding-only, capped per file, no advertised tool, and a passing scan is silent (never a "clean" signal to game)
//   - opt-in: flag a run that changed logic but touched no test
//
// Settings live in two lazily-created files (config.ts): a project-local
// `.pi/greybeard.json` that every toggle writes and a subagent spawned here
// inherits, and a global default. No session-scoped state: local is the live
// store. `default` promotes the current settings to the global file.
//
// Surface stays simple: a footer statusline, one per-run action card, a toggle panel.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG_DIR_NAME, getSettingsListTheme, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Box, Container, Key, type SettingItem, SettingsList, Text } from "@earendil-works/pi-tui";
import { cleanTypography } from "./lib/typography.ts";
import { detectDependencyInstall } from "./lib/deps.ts";
import { findTells, formatTells } from "./lib/tells.ts";
import { clearGlobal, clearLocal, DEFAULT_MARKER, DEFAULT_MODE, type Mode, parseAxesSpec, resolveConfig, writeGlobal, writeLocal } from "./lib/config.ts";

const baseDir = dirname(fileURLToPath(import.meta.url));

const GLYPH = "🧙"; // wizard: the grey-bearded veteran. Chrome, not prose, so the anti-emoji rule does not apply.

// Read once at load. /reload re-imports this module and re-reads, so editing the
// markdown updates the steering with no code change.
function readStandard(name: string): string {
  try {
    return readFileSync(join(baseDir, "standards", name), "utf8").trim();
  } catch {
    return "";
  }
}
const CODING = readStandard("coding.md");
const WRITING = readStandard("writing.md");

// The decision comment is mandatory; its prefix is configuration (overridable, or empty).
const markerLine = (m: string) =>
  m
    ? `Prefix it with \`${m}\` for a greppable trail: \`// ${m} added pico-args; stdlib has no arg parser\`.`
    : "Example: `// added pico-args; stdlib has no arg parser`.";

const PROSE = /\.(md|mdx|markdown|txt|rst)$/i;
const TEST = /(^|[/\\])(tests?|spec|__tests__)[/\\]|\.(test|spec)\./i;
// Per-file re-flag ceiling per run. A model that cannot fix a tell would otherwise loop
// on re-writes; after the cap the append goes silent and the run ends.
const TELL_CAP = 3;

const isProse = (p: string) => PROSE.test(p) || /COMMIT_EDITMSG$/.test(p);
const isTest = (p: string) => TEST.test(p);

type ActionKind = "typo" | "dep" | "tell" | "test";
interface Action {
  kind: ActionKind;
  detail: string;
}
interface LogData {
  actions: Action[];
}

function summarize(actions: Action[]): string {
  const c: Record<ActionKind, number> = { typo: 0, dep: 0, tell: 0, test: 0 };
  for (const a of actions) c[a.kind]++;
  const parts: string[] = [];
  if (c.typo) parts.push(`${c.typo} typography fix${c.typo > 1 ? "es" : ""}`);
  if (c.dep) parts.push(`${c.dep} dependency flag${c.dep > 1 ? "s" : ""}`);
  if (c.tell) parts.push(`${c.tell} tell${c.tell > 1 ? "s" : ""} flagged`);
  if (c.test) parts.push("test gap");
  return parts.join(", ");
}

// Static reference card. Purely mechanical: printed as-is, no model involved.
const HELP: string[] = [
  "greybeard: the least code that works, the least prose that informs.",
  "",
  "Axes (toggle independently)",
  "  code    the coding ladder, build the least that works",
  "  prose   anti-slop writing standards + typography fixes",
  "  test    flag logic changed with no test touched",
  "",
  "Commands",
  "  /greybeard                            open the toggle panel",
  "  /greybeard write <instructions>       one-shot: generate prose to the writing standards, no mode change",
  "  /greybeard code|prose|test [on|off]   toggle an axis (bare flips it)",
  "  /greybeard on | off                   both axes at once",
  "  /greybeard prefix <text|none>         decision-comment prefix (default WHY:)",
  "  /greybeard default                    save current settings as the global default",
  "  /greybeard reset [local|global|all]   drop a settings layer, re-resolve",
  "  /greybeard status                     current axes, prefix, session tally",
  "  /greybeard help                       this card",
  "  ctrl-alt-g                            flip greybeard on/off",
  "",
  "Settings (resolution: local, then global, then defaults)",
  "  local   <project>/.pi/greybeard.json     written by every toggle",
  "  global  ~/.config/greybeard/config.json  written by 'default'",
];

export default function greybeard(pi: ExtensionAPI): void {
  // Per-invocation axes override, aimed at headless runs: `pi --greybeard code,prose ...`.
  // Highest-precedence layer, never persisted, honored untrusted (an axes spec carries
  // no free text into the model's instructions, unlike the decision prefix).
  pi.registerFlag("greybeard", {
    description: "Axes override for this invocation: off | on | comma list of code,prose,test",
    type: "string",
  });

  let mode: Mode = { ...DEFAULT_MODE };
  let marker = DEFAULT_MARKER;
  let lastCtx: ExtensionContext | undefined;
  let cwd: string | undefined; // for the local config file
  let trusted = false; // read the local file only when the project is trusted
  let hideStatus = false; // hand-edited config flag: keep greybeard active, hide the indicator

  // per-run state
  let specError = false; // invalid --greybeard spec: session is shutting down, abort any turn that races it
  let active = false;
  let runLedger: Action[] = [];
  let touchedSource = false;
  let touchedTest = false;
  const tellFlags = new Map<string, number>(); // per-file tell-append count this run (TELL_CAP guard)
  let oneShotProse = false; // `/greybeard write`: run prose enforcement for this run without touching the axes

  // session state
  const totals = { typo: 0, dep: 0, tell: 0 };

  const axesLabel = () => [mode.code && "code", mode.prose && "prose"].filter(Boolean).join("+");
  const sessionLine = () => {
    const p: string[] = [];
    if (totals.typo) p.push(`${totals.typo} fixes`);
    if (totals.dep) p.push(`${totals.dep} flags`);
    if (totals.tell) p.push(`${totals.tell} tells`);
    return p.length ? p.join(", ") : "no actions yet";
  };

  function syncStatus(ctx?: ExtensionContext) {
    if (ctx) lastCtx = ctx;
    const c = ctx || lastCtx;
    if (!c?.ui?.setStatus) return;
    if (hideStatus || (!mode.code && !mode.prose)) {
      c.ui.setStatus("greybeard", undefined);
      return;
    }
    // Theme access and use can throw before init (pi-web proxy); a status line must not crash the session.
    try {
      const t = c.ui.theme;
      if (!t?.fg) return;
      const dot = active ? t.fg("accent", "\u25CF") : t.fg("dim", "\u25CB");
      let s = `${dot} ${GLYPH} ${t.fg("muted", "greybeard: ")}${t.fg("text", axesLabel())}`;
      if (mode.test) s += t.fg("dim", " +test");
      if (runLedger.length) s += t.fg("dim", ` \u00B7 ${runLedger.length} this run`);
      c.ui.setStatus("greybeard", s);
    } catch {
      /* theme not ready; skip this status update */
    }
  }

  // A toggle writes the project-local file: it is the live store and what a
  // subagent spawned in this cwd inherits. Best-effort; a failed write must not
  // break the toggle.
  const persist = () => {
    if (!cwd) return;
    try {
      writeLocal(cwd, { mode, marker }, CONFIG_DIR_NAME);
    } catch {
      /* presentation/config only */
    }
  };

  // -- steering: inject only the enabled axes, appended to the chained system prompt --
  pi.on("before_agent_start", (event) => {
    const blocks: string[] = [];
    if (mode.code && CODING) blocks.push(CODING.replace("{{marker_line}}", markerLine(marker)));
    if (mode.prose && WRITING) blocks.push(WRITING);
    if (!blocks.length) return;
    // Guard a missing systemPrompt: never prepend the literal string "undefined".
    const base = event.systemPrompt ? `${event.systemPrompt}\n\n` : "";
    return { systemPrompt: `${base}${blocks.join("\n\n")}` };
  });

  // -- resolve settings: local (trusted) -> global -> defaults --
  pi.on("session_start", (_event, ctx) => {
    cwd = ctx.cwd;
    trusted = ctx.isProjectTrusted?.() ?? false;
    const c = resolveConfig(cwd, trusted, CONFIG_DIR_NAME);
    mode = c.mode;
    marker = c.marker;
    hideStatus = c.hideStatus;
    const spec = pi.getFlag("greybeard");
    if (spec !== undefined) {
      const parsed = typeof spec === "string" ? parseAxesSpec(spec) : undefined;
      if (!parsed) {
        // Kill the session, not just this handler: pi logs a thrown handler error
        // and keeps running, which in a headless run would silently measure the
        // wrong axes. Axes go dark, the turn (if one races the exit) gets aborted
        // in agent_start, and the session shuts down.
        specError = true;
        mode = { code: false, prose: false, test: false };
        const msg = `greybeard: invalid --greybeard spec "${String(spec)}" (off | on | comma list of code,prose,test); shutting down`;
        console.error(msg);
        try {
          ctx.ui.notify(msg, "error");
        } catch {
          /* headless: stderr already has it */
        }
        ctx.shutdown();
        return;
      }
      mode = parsed;
    }
    active = false;
    runLedger = [];
    syncStatus(ctx);
  });

  pi.on("input", (event) => {
    if (event.source !== "extension") {
      oneShotProse = false; // a real prompt ends any pending one-shot write
    }
  });

  pi.on("agent_start", (_event, ctx) => {
    if (specError) {
      // Doomed session (invalid --greybeard spec): never let a racing turn reach the API.
      ctx.abort();
      ctx.shutdown();
      return;
    }
    active = true;
    runLedger = [];
    touchedSource = false;
    touchedTest = false;
    tellFlags.clear();
    syncStatus(ctx);
  });

  // -- enforcement, all soft --
  pi.on("tool_result", (event, ctx) => {
    if (event.isError) return undefined;
    const input = event.input as { path?: string; command?: string };

    // coding: dependency reminder (steers via appended note, never blocks)
    if (mode.code && event.toolName === "bash" && detectDependencyInstall(input.command ?? "")) {
      runLedger.push({ kind: "dep", detail: (input.command ?? "").trim() });
      totals.dep++;
      syncStatus(ctx);
      return {
        content: [
          ...event.content,
          {
            type: "text" as const,
            text: `greybeard: rung 5, a new dependency is a design decision. Leave a comment${marker ? ` prefixed \`${marker}\`` : ""} at the use site naming what you chose and the stdlib or existing alternative you rejected.`,
          },
        ],
      };
    }

    const path = input.path;
    if (!path || (event.toolName !== "write" && event.toolName !== "edit")) return undefined;

    // test backstop tracking
    if (isTest(path)) touchedTest = true;
    else if (!isProse(path)) touchedSource = true;

    // writing: silent on-disk fix for safe substitutions (zero tokens), then flag the
    // tells that need judgment back into the model's own tool result so it self-corrects
    // this turn, before the user looks. Finding-only: a passing scan appends nothing, so
    // silence is never a "clean" signal. No advertised tool means no green light to game.
    if ((mode.prose || oneShotProse) && isProse(path)) {
      let content: string;
      try {
        content = readFileSync(path, "utf8");
      } catch {
        return undefined;
      }
      const cleaned = cleanTypography(content);
      if (cleaned !== content) {
        try {
          writeFileSync(path, cleaned);
          runLedger.push({ kind: "typo", detail: path });
          totals.typo++;
          syncStatus(ctx);
        } catch {
          /* best effort; presentation only */
        }
      }
      const tells = findTells(cleaned);
      const flagged = tellFlags.get(path) ?? 0;
      if (tells.length && flagged < TELL_CAP) {
        tellFlags.set(path, flagged + 1);
        runLedger.push({ kind: "tell", detail: `${path}: ${tells.length} tell(s)` });
        totals.tell++;
        syncStatus(ctx);
        return { content: [...event.content, { type: "text" as const, text: formatTells(tells) }] };
      }
    }
    return undefined;
  });

  // -- end of run: test backstop, action card --
  pi.on("agent_settled", (_event, ctx) => {
    active = false;

    if (mode.test && touchedSource && !touchedTest) {
      runLedger.push({ kind: "test", detail: "logic changed, no test touched (rung 9)" });
    }

    if (runLedger.length) pi.appendEntry<LogData>("greybeard-log", { actions: [...runLedger] });

    oneShotProse = false; // the one-shot write's run is done
    syncStatus(ctx);
  });

  // -- durable per-run card (never sent to the LLM) --
  pi.registerEntryRenderer<LogData>("greybeard-log", (entry, { expanded }, theme) => {
    const actions = entry.data?.actions ?? [];
    const box = new Box(1, 1, (t) => theme.bg("customMessageBg", t));
    box.addChild(new Text(`${GLYPH} ${theme.fg("accent", "greybeard")} ${summarize(actions)}`, 0, 0));
    if (expanded) for (const a of actions) box.addChild(new Text(theme.fg("dim", `  ${a.kind}: ${a.detail}`), 0, 0));
    return box;
  });

  // -- command: subcommands for speed, no-arg opens the toggle panel --
  // `code`/`prose`/`test` toggle, or take an explicit `on`/`off`; `on`/`off` set both axes.
  function apply(sub: string): boolean {
    const [key, val] = sub.split(/\s+/);
    const set = (cur: boolean) => (val === "on" ? true : val === "off" ? false : !cur);
    switch (key) {
      case "code": mode.code = set(mode.code); return true;
      case "prose": mode.prose = set(mode.prose); return true;
      case "test": mode.test = set(mode.test); return true;
      case "on": mode.code = true; mode.prose = true; return true;
      case "off": mode.code = false; mode.prose = false; return true;
      default: return false;
    }
  }

  pi.registerCommand("greybeard", {
    description: "greybeard: no arg opens the panel; write <instructions> | code|prose|test [on|off] | on | off | prefix <text|none> | default | reset [local|global|all] | status | help",
    handler: async (args, ctx) => {
      const raw = String(args || "").trim();
      const sub = raw.toLowerCase();
      const report = () =>
        ctx.ui.notify(
          `greybeard: ${axesLabel() || "off"}${mode.test ? " +test" : ""} \u00B7 prefix ${marker || "none"} \u00B7 ${sessionLine()}`,
          "info",
        );

      if (sub === "help" || sub === "?") {
        if (ctx.mode !== "tui") return ctx.ui.notify(HELP.join("\n"), "info");
        await ctx.ui.custom((_tui, theme, _kb, done) => {
          const c = new Container();
          for (const line of HELP) c.addChild(new Text(line ? theme.fg("text", line) : "", 0, 0));
          c.addChild(new Text(theme.fg("dim", "press any key to close"), 1, 0));
          return {
            render: (w) => c.render(w),
            invalidate: () => c.invalidate(),
            handleInput: () => done(undefined),
          };
        });
        return;
      }

      // One-shot writing: inject the writing standard ahead of the instructions and
      // fire a single run. No mode toggle, so a code-mode session can generate a doc
      // to the standards and stay in code mode. Enforcement backstops stay gated on
      // the prose axis; the standard in-context is what governs this run.
      if (sub === "write") return ctx.ui.notify("greybeard: pass instructions after 'write' to generate prose to the writing standards", "info");
      if (sub.startsWith("write ")) {
        if (!WRITING) return ctx.ui.notify("greybeard: writing standards unavailable (standards/writing.md missing)", "error");
        const instructions = raw.slice(6).trim();
        if (!instructions) return ctx.ui.notify("greybeard: nothing to write; pass instructions after 'write'", "warning");
        pi.sendUserMessage(`${WRITING}\n\nApply the writing standards above to this task:\n\n${instructions}`);
        return ctx.ui.notify("greybeard: writing to the standards\u2026", "info");
      }

      if (sub === "prefix") return ctx.ui.notify(`greybeard: decision prefix is ${marker || "none"}`, "info");
      if (sub.startsWith("prefix ")) {
        const val = raw.slice(7).trim();
        marker = /^(none|off)$/i.test(val) ? "" : val;
        persist();
        return ctx.ui.notify(
          marker ? `greybeard: decision prefix set to "${marker}"` : "greybeard: decision prefix cleared (the comment is still required)",
          "info",
        );
      }

      if (sub === "default") {
        try {
          const p = writeGlobal({ mode, marker });
          return ctx.ui.notify(`greybeard: saved current settings as the global default (${p})`, "info");
        } catch (e) {
          return ctx.ui.notify(`greybeard: failed to write global default: ${(e as Error).message}`, "error");
        }
      }

      // Drop a settings file so resolution falls to the next layer down.
      // `local` (default) stops this project overriding the global default;
      // `global` clears the cross-project default; `all` does both, back to
      // the hardcoded floor. Then re-resolve so the live session matches.
      if (sub === "reset" || sub.startsWith("reset ")) {
        const scope = sub.slice(5).trim() || "local";
        if (!/^(local|global|all)$/.test(scope)) return ctx.ui.notify(`greybeard: reset takes local|global|all`, "warning");
        if (scope !== "global" && cwd) clearLocal(cwd, CONFIG_DIR_NAME);
        if (scope !== "local") clearGlobal();
        const c = resolveConfig(cwd, trusted, CONFIG_DIR_NAME);
        mode = c.mode;
        marker = c.marker;
        syncStatus(ctx);
        return report();
      }

      if (sub === "status") return report();
      if (sub && sub !== "panel") {
        if (!apply(sub)) return ctx.ui.notify(`greybeard: unknown option '${sub}'`, "warning");
        persist();
        syncStatus(ctx);
        return report();
      }

      if (ctx.mode !== "tui") return report();

      await ctx.ui.custom((_tui, theme, _kb, done) => {
        const container = new Container();
        container.addChild(new Text(`${GLYPH} ${theme.fg("accent", theme.bold("greybeard"))}  ${theme.fg("dim", `this session: ${sessionLine()}  \u00B7  prefix: ${marker || "none"}`)}`, 1, 1));
        const items: SettingItem[] = [
          { id: "code", label: "Coding standards (ladder)", currentValue: mode.code ? "on" : "off", values: ["on", "off"] },
          { id: "prose", label: "Writing standards (anti-slop)", currentValue: mode.prose ? "on" : "off", values: ["on", "off"] },
          { id: "test", label: "Test backstop (logic changed, no test)", currentValue: mode.test ? "on" : "off", values: ["on", "off"] },
        ];
        const list = new SettingsList(
          items,
          Math.min(items.length + 2, 15),
          getSettingsListTheme(),
          (id, val) => {
            const on = val === "on";
            if (id === "code") mode.code = on;
            else if (id === "prose") mode.prose = on;
            else if (id === "test") mode.test = on;
            persist();
            syncStatus(ctx);
          },
          () => done(undefined),
        );
        container.addChild(list);
        return {
          render: (w) => container.render(w),
          invalidate: () => container.invalidate(),
          handleInput: (d) => list.handleInput?.(d),
        };
      });
    },
  });

  // -- shortcut: flip everything on/off --
  pi.registerShortcut(Key.ctrlAlt("g"), {
    description: "Toggle greybeard on/off",
    handler: async (ctx) => {
      const anyOn = mode.code || mode.prose;
      mode.code = !anyOn;
      mode.prose = false;
      persist();
      syncStatus(ctx);
      ctx.ui.notify(`greybeard: ${axesLabel() || "off"}`, "info");
    },
  });

  // -- register the on-demand skills --
  pi.on("resources_discover", () => ({
    skillPaths: [
      join(baseDir, "skills", "greybeard-review", "SKILL.md"),
      join(baseDir, "skills", "greybeard-audit", "SKILL.md"),
      join(baseDir, "skills", "greybeard-ledger", "SKILL.md"),
    ],
  }));
}
