// greybeard settings, lazy-materialized. Neither file is created until you set
// something; a missing file resolves to the defaults.
//
//   local:  <cwd>/<configDir>/greybeard.json   this project, read only when
//           trusted, and the file a subagent spawned here inherits.
//   global: ~/.config/greybeard/config.json    (XDG / %APPDATA% aware) the
//           cross-project default.
//
// Resolution: local (if trusted) -> global -> hardcoded defaults.
//
// pi-free on purpose: the config-dir name ("./pi" etc.) is passed in by the
// caller so this module carries no pi import and runs under a bare `node --test`.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface Mode {
  code: boolean;
  prose: boolean;
  test: boolean;
}
export interface Config {
  mode: Mode;
  marker: string;
}

export const DEFAULT_MODE: Mode = { code: true, prose: false, test: false };
export const DEFAULT_MARKER = "WHY:";

export function globalConfigPath(): string {
  const base = process.env.XDG_CONFIG_HOME
    ? process.env.XDG_CONFIG_HOME
    : process.platform === "win32"
      ? (process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"))
      : join(homedir(), ".config");
  return join(base, "greybeard", "config.json");
}

export function localConfigPath(cwd: string, configDir: string): string {
  return join(cwd, configDir, "greybeard.json");
}

interface Partial_ {
  mode?: Partial<Mode>;
  marker?: string;
  hideStatus?: boolean;
}

// What resolveConfig returns: the writable snapshot plus read-only presentation
// flags. Presentation flags are hand-edited into the file, never snapshotted.
export interface Resolved extends Config {
  hideStatus: boolean;
}

// A missing, empty, or malformed file reads as "nothing set": a parse error returns empty.
function readPartial(path: string): Partial_ {
  try {
    const obj = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")); // strip BOM (Windows)
    if (!obj || typeof obj !== "object") return {};
    const out: Partial_ = {};
    if (obj.mode && typeof obj.mode === "object") {
      const m: Partial<Mode> = {};
      for (const k of ["code", "prose", "test"] as const) if (typeof obj.mode[k] === "boolean") m[k] = obj.mode[k];
      out.mode = m;
    }
    if (typeof obj.marker === "string") out.marker = obj.marker; // "" is valid: no prefix, comment still required
    if (typeof obj.hideStatus === "boolean") out.hideStatus = obj.hideStatus;
    return out;
  } catch {
    return {};
  }
}

export function resolveConfig(cwd: string | undefined, trusted: boolean, configDir: string): Resolved {
  const g = readPartial(globalConfigPath());
  const l = trusted && cwd ? readPartial(localConfigPath(cwd, configDir)) : {};
  return {
    mode: { ...DEFAULT_MODE, ...g.mode, ...l.mode },
    marker: l.marker ?? g.marker ?? DEFAULT_MARKER,
    hideStatus: l.hideStatus ?? g.hideStatus ?? false,
  };
}

// Merge the snapshot over the existing file so hand-edited keys (hideStatus, or
// anything future) survive a `default`/toggle write instead of being clobbered.
function write(path: string, cfg: Config): string {
  mkdirSync(dirname(path), { recursive: true });
  let existing: Record<string, unknown> = {};
  try {
    const obj = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
    if (obj && typeof obj === "object" && !Array.isArray(obj)) existing = obj;
  } catch {
    /* absent or malformed; start clean */
  }
  const merged = { ...existing, mode: cfg.mode, marker: cfg.marker };
  writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`);
  return path;
}

export const writeGlobal = (cfg: Config): string => write(globalConfigPath(), cfg);
export const writeLocal = (cwd: string, cfg: Config, configDir: string): string =>
  write(localConfigPath(cwd, configDir), cfg);

// Delete a settings file so resolution falls to the next layer. Missing is fine
// (force), so "reset" is idempotent. Returns whether a file was actually removed.
function remove(path: string): boolean {
  try {
    rmSync(path);
    return true;
  } catch {
    return false; // absent or unremovable; the caller re-resolves either way
  }
}

export const clearGlobal = (): boolean => remove(globalConfigPath());
export const clearLocal = (cwd: string, configDir: string): boolean => remove(localConfigPath(cwd, configDir));
