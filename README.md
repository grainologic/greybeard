<div align="center">

  # greybeard

  <img src="resources/greybeard.png" width="120" align="center" alt=""> 

  **greybeard** &nbsp;/ˈɡreɪbɪəd/&nbsp; *n.* A developer of mythological skill and seniority, who solves in ten minutes<br/>what cost the rest of the team two sprints, then melts back into their chair as if nothing had happened.

</div>

---

A pi extension that sits an old, tired, brilliant engineer in the passenger seat. It just leans over now and then and mutters the thing a principal engineer would have muttered: *do you actually need to build that?*

## What it leans over to say

It watches two things, and you turn either one on or off on its own.

### code (`standards/coding.md`)

*Greybeard writes the least code that works.* Least never means *unsafe*. It understands the problem, then climbs from "does this need to exist?" up to "the minimum code that works," and no higher.

The task: "Make the size limit configurable instead of hardcoded." Unsteered, Opus 4.8 answered with a size-parsing DSL, excerpt of a +40 line diff:

```diff
+_UNITS = {"": 1, "B": 1, "K": 1024, "KB": 1024, "M": 1024**2,
+          "MB": 1024**2, "G": 1024**3, "GB": 1024**3}
+
+def parse_size(text):
+    """Parse a size like '500000', '2MB', or '1.5G' into a byte count."""
```

With greybeard, the same model on the same task, the heart of a +7 line diff:

```diff
-def scan(root):
+def scan(root, size_limit=SIZE_LIMIT_BYTES):
```

Both pass every check, every run. Sonnet 5 went +48 to +10 the same way.

The bottom rung of the ladder is "does this need to exist?" Handed a caching bug, every model fixed the code. With greybeard, DeepSeek v4 pro *deleted* the cache instead:

```diff
diff --git a/cache.js b/cache.js
deleted file mode 100644
--- a/cache.js
+++ /dev/null
```

Both ways fix the bug. But models do not delete code. Only greybeard makes them.

### prose (`standards/writing.md`)

*Greybeard writes the least prose that informs.* Least never means *disjointed*. Text shortened to the point of sparse words is a greater cognitive load than a well used short sentence. Text that reads like AI-slop completely removes trust in the thing that is being read. Greybeard addresses that. No emoji, excessive symbol usage, performative enthusiasm.

The task: write the README for a small file-scanning tool, given nothing but its source. Both models describe the same tool; row by row, the same fact.

| Unsteered, Haiku 4.5 | With greybeard, the same model |
|---|---|
| **Fast scanning** with automatic pruning of common non-essential directories | Skips `.git`, `.hg`, `.svn`, `node_modules`, `__pycache__`, `.venv` (these are slow and never the target) |
| **Sorted output** by file size (largest first) | Prints every file over 1 MB, one per line, largest first. Format is size then path. |
| **Robust error handling** for symlinks, inaccessible files, and race conditions | Ignores symlinks. Recovers gracefully if files are deleted or become unreadable mid-walk. |
| **Clean output** that's pipeable for further processing<br>**Summary statistics** sent to stderr to preserve stdout for piping | Summary (file count, total size) goes to stderr so the list stays pipeable. |

The full READMEs: 393 words unsteered, 128 with greybeard, covering the same tool. The difference is what the standard removes: filler adjectives, padded sections, enthusiasm without content.

## Tools of the trade

The rules are the voice in the room. This is what the hands do.

|   |
|---|
| **A `bash` command just installed a dependency. Now what?**<br>A reminder that a new dependency is a design decision worth a justifying comment. Covers most package managers (13, in `lib/deps.ts`): npm, pip, poetry, uv, cargo, go, vcpkg, dotnet, and more. |
| **The model wrote a prose file. Emoji, curly quotes, the usual. Who cleans up?**<br>greybeard does, on disk, silently: emoji, tight en-dashes, curly quotes. Safe fixes only, no round trip through the model, no tokens spent. |
| **A sentence reads like a machine wrote it. Then what?**<br>The offending sentences (em-dash, cluster vocabulary) come back appended to the model's own write result, so it self-corrects in the same turn. Finding-only and capped; a clean scan says nothing. |
| **Source changed, but no test did.**<br>The run gets flagged at the end. This one stays quiet until you turn it on. |

Around all that: a statusline, a card summing up each run, a toggle panel, and
`ctrl-alt-g` to flip everything on and off.

## Benchmarks
[Coming soon!](https://github.com/grainologic/greybeard)

## Install

Install it with pi, for every project:

```bash
pi install npm:pi-greybeard
```

Or just this project (writes to `.pi/settings.json`, so you can commit it and
your team gets it on startup):

```bash
pi install -l npm:pi-greybeard
```

Or try it for one run without installing:

```bash
pi -e npm:pi-greybeard
```

Editing `standards/coding.md` or `standards/writing.md` and running `/reload`
changes the persona with no code change. The markdown is the config.

## Telling it what to do

| Command | Effect |
|---|---|
| `/greybeard` | Open the toggle panel |
| `/greybeard write <instructions>` | One-shot: generate prose to the writing standards without changing the active axes |
| `/greybeard code`/`prose`/`test` `[on\|off]` | Toggle one axis (bare flips it) |
| `/greybeard on` / `off` | Both axes at once |
| `/greybeard prefix <text\|none>` | Set the decision-comment prefix (default `WHY:`) |
| `/greybeard default` | Promote the current settings to the global default |
| `/greybeard reset [local\|global\|all]` | Drop a settings layer (default `local`) and re-resolve |
| `/greybeard status` | Report current axes, prefix, and session tally |
| `/greybeard help` | Print the command reference card |
| `ctrl-alt-g` | Flip greybeard on/off |

## Settings

greybeard keeps two settings files, and neither exists until you change
something. No file means you get the defaults.

- **local**, `<project>/.pi/greybeard.json`. Every toggle you flip writes here,
  so your settings stick to this one project. greybeard reads it only when the
  project is trusted, because the decision prefix is free text that ends up in
  the model's instructions.
- **global**, `~/.config/greybeard/config.json` (it respects `XDG_CONFIG_HOME`,
  and `%APPDATA%` on Windows). This is your default across every project.
  `/greybeard default` writes it.

greybeard checks your local file first, then the global one, then falls back to
the built-in defaults (code on, prose off). Since flipping a toggle always
writes local, the moment you touch a project it takes over from your global
default. When you want to go back, drop a layer:

- `/greybeard reset` (or `reset local`): delete this project's file, fall back
  to your global default.
- `/greybeard reset global`: clear your cross-project default.
- `/greybeard reset all`: back to the built-in defaults.

You can also hand-edit `"hideStatus": true` into either file to keep greybeard
running while hiding the statusline. It survives a `/greybeard default`, so you
set it once and forget it.

Your settings stay put until you change them, so `.pi/greybeard.json` is a real
file in your repo: commit it to share the persona with your team, or gitignore
it to keep it yours.

## Skills

- `/skill:greybeard-review`: review a diff or named files against the ladder
  and the writing standards. Reports what to cut, edits nothing unless asked.
- `/skill:greybeard-audit`: the same hunt across the whole repo, ranked by
  payoff.
- `/skill:greybeard-ledger`: harvest greybeard's decision comments into a
  ledger, splitting settled decisions from deferred debt. One-shot report.

## Development

Tests are `*.selfcheck.ts`, plain `node --test`, no framework:

```bash
node --test --experimental-strip-types 'test/*.selfcheck.ts'
```

Layout: `index.ts` is the pi entry (the only file that touches the pi API and
must sit at the extension root for auto-discovery). `lib/` holds the pure,
pi-free logic (`config.ts`, `deps.ts`, `typography.ts`, `tells.ts`), which is why it runs
under a bare Node. `test/` holds the self-checks, `standards/` the rules it
applies, `skills/` the on-demand review and audit passes.
