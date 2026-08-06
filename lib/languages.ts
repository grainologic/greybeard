// File extension to language slug, for the per-language example notes.
//
// A slug activates when standards/lang/<slug>.md exists, so a language is added
// by writing the markdown, with no change here. Several extensions share a slug
// where they share a standard library.

const BY_EXTENSION: Record<string, string> = {
  ".py": "python", ".pyw": "python",
  ".js": "javascript", ".mjs": "javascript", ".cjs": "javascript", ".jsx": "javascript",
  ".ts": "javascript", ".tsx": "javascript", ".mts": "javascript", ".cts": "javascript",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin", ".kts": "kotlin",
  ".swift": "swift",
  ".rb": "ruby",
  ".php": "php",
  ".cs": "csharp",
  ".c": "c", ".h": "c",
  ".cpp": "cpp", ".cc": "cpp", ".cxx": "cpp", ".hpp": "cpp", ".hh": "cpp",
  ".sh": "shell", ".bash": "shell", ".zsh": "shell",
  ".ps1": "powershell", ".psm1": "powershell",
  ".sql": "sql",
  ".lua": "lua",
  ".dart": "dart",
  ".scala": "scala",
  ".ex": "elixir", ".exs": "elixir",
  ".r": "r",
  ".pl": "perl", ".pm": "perl",
  ".hs": "haskell",
};

export function languageFor(path: string): string | undefined {
  const name = path.replace(/\\/g, "/").split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return undefined; // no extension, or a dotfile with no suffix
  return BY_EXTENSION[name.slice(dot).toLowerCase()];
}
