import assert from "node:assert/strict";
import { test } from "node:test";
import { detectDependencyInstall } from "../lib/deps.ts";

test("named install fires across package managers", () => {
  for (const cmd of [
    "npm install lodash",
    "npm i react",
    "pnpm add zod",
    "yarn add express",
    "bun add hono",
    "pip install requests",
    "pip3 install httpx",
    "poetry add rich",
    "cargo add serde",
    "go get github.com/foo/bar",
    "gem install rails",
    "composer require monolog/monolog",
    "vcpkg install fmt",
    "vcpkg add port fmt",
    "dotnet add package Newtonsoft.Json",
    "nuget install Serilog",
    "paket add FSharp.Core",
    "dart pub add http",
    "flutter pub add provider",
    "cabal install aeson",
    "stack install text",
    "nimble install jester",
    "luarocks install luasocket",
    "cpanm JSON::XS",
    "uv add httpx",
    "uv pip install httpx",
    "conda install numpy",
    "pipenv install flask",
  ]) {
    assert.equal(detectDependencyInstall(cmd), true, cmd);
  }
});

test("bare restore from a manifest stays silent", () => {
  for (const cmd of [
    "npm install",
    "npm i",
    "pip install -r requirements.txt",
    "pip install --requirement requirements-dev.txt",
    "poetry install",
    "yarn",
    "vcpkg install",
    "conan install .",
    "pip install .",
    "cabal install",
  ]) {
    assert.equal(detectDependencyInstall(cmd), false, cmd);
  }
});

test("flags alone are not a package", () => {
  assert.equal(detectDependencyInstall("npm install --save-dev"), false);
});

test("unrelated commands never fire", () => {
  for (const cmd of ["ls -la", "git add .", "go build ./...", "npm run test"]) {
    assert.equal(detectDependencyInstall(cmd), false, cmd);
  }
});

test("fires past leading flags to a real package", () => {
  assert.equal(detectDependencyInstall("npm install --save-dev typescript"), true);
});
