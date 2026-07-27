// Detect a dependency *install* command for the coding-axis nudge.
//
// True only when the command adds a named package. Bare restores that pull from
// a manifest (`npm install`, `pip install -r requirements.txt`, `poetry install`)
// have no package argument and stay silent: they add nothing new to justify.

export function detectDependencyInstall(cmd: string): boolean {
  const m = cmd.match(
    new RegExp(
      "\\b(" +
        [
          "(?:npm|pnpm|yarn|bun)\\s+(?:i|install|add)", // JS/TS
          "(?:pip3?|pipenv|conda|mamba)\\s+install|poetry\\s+(?:install|add)|uv\\s+add", // Python (uv pip install matches the pip branch)
          "cargo\\s+add", // Rust
          "go\\s+get", // Go
          "gem\\s+install", // Ruby
          "composer\\s+require", // PHP
          "vcpkg\\s+(?:install|add)", // C/C++ (conan install is a restore, not a named add)
          "dotnet\\s+add\\s+package|nuget\\s+install|paket\\s+add", // .NET
          "(?:dart|flutter)\\s+pub\\s+add", // Dart/Flutter
          "(?:cabal|stack)\\s+install", // Haskell
          "nimble\\s+install", // Nim
          "luarocks\\s+install", // Lua
          "cpanm", // Perl
        ].join("|") +
        ")\\b",
    ),
  );
  if (!m || m.index === undefined) return false;
  return cmd
    .slice(m.index + m[0].length)
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !t.startsWith("-"))
    .filter((t) => !/^\.{1,2}[/\\]?$/.test(t)) // a lone . / .. / ./ is a restore target, not a package
    .filter((t) => !/requirements|package\.json|\.txt$/i.test(t)).length > 0;
}
