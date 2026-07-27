<div align="center">

  # <img src="resources/greybeard.png" width="40" align="center" alt=""> greybeard

  **greybeard** &nbsp;/ˈɡreɪbɪəd/&nbsp; *n.*
  A developer of mythological skill and seniority, who solves in ten minutes
  what cost the rest of the team two sprints, then melts back into their chair
  as if nothing had happened.
</div>

---

A pi extension that sits an old, tired, brilliant engineer in the passenger
seat. It never grabs the wheel. It just leans over now and then and mutters
the thing a principal engineer would have muttered: *do you actually need to
build that?*

## What it does

It watches two things, and you turn either one on or off on its own.

- **code**: applies the coding ladder (`standards/coding.md`). Understand the
  problem, then climb from "does this need to exist?" up to "the minimum code
  that works," and no higher.
- **prose**: applies the writing standards (`standards/writing.md`). Kill the
  slop, the hedging, the rule-of-three reflex, the performed enthusiasm.

The rules are the voice in the room. These are its hands:

| When | What happens |
|---|---|
| A `bash` command installs a named dependency | Leaves a reminder that a new dependency is a design decision worth a justifying comment. Covers most package managers (13, in `lib/deps.ts`): npm, pip/poetry/uv, cargo, go, vcpkg, dotnet, and more. |
| A prose file is written | Fixes emoji and tight en-dashes on disk, silently. |
| A prose file still carries em-dashes | Returns the offending sentences once for a rewrite (up to 3 per prompt). |
| Source changed, but no test did | Flags the run at the end. Stays quiet until you turn it on. |

Around all that: a statusline, a card summing up each run, a toggle panel, and
`ctrl-alt-g` to flip everything on and off.

## Install

Install it with pi, for every project:

```bash
pi install git:github.com/aashishvasu/greybeard
```

Or just this project (writes to `.pi/settings.json`, so you can commit it and
your team gets it on startup):

```bash
pi install -l git:github.com/aashishvasu/greybeard
```

Or try it for one run without installing:

```bash
pi -e git:github.com/aashishvasu/greybeard
```

Editing `standards/coding.md` or `standards/writing.md` and running `/reload`
changes the persona with no code change. The markdown is the config.

## Commands

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

## Development

Tests are `*.selfcheck.ts`, plain `node --test`, no framework:

```bash
node --test '**/*.selfcheck.ts'
```

Layout: `index.ts` is the pi entry (the only file that touches the pi API and
must sit at the extension root for auto-discovery). `lib/` holds the pure,
pi-free logic (`config.ts`, `deps.ts`, `typography.ts`), which is why it runs
under a bare Node. `test/` holds the self-checks, `standards/` the rules it
applies, `skills/` the on-demand review and audit passes.
