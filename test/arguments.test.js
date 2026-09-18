import assert from "node:assert/strict";
import test from "node:test";
import { parseCliArguments } from "../src/arguments.js";

test("parses non-interactive multi-stack arguments", () => {
  const options = parseCliArguments([
    "example", "--apps", "sveltekit,flutter,python",
    "--features", "ci", "--package-manager", "pnpm",
    "--yes", "--no-git",
  ]);
  assert.equal(options.destination, "example");
  assert.deepEqual(options.apps, ["sveltekit", "flutter", "python"]);
  assert.equal(options.git, false);
  assert.equal(options.yes, true);
});

test("rejects unknown application recipes", () => {
  assert.throws(() => parseCliArguments(["example", "--apps", "unknown"]), /Unknown application type/);
});

test("accepts explicit empty selections", () => {
  const options = parseCliArguments(["example", "--apps", "none", "--features", "none"]);
  assert.deepEqual(options.apps, []);
  assert.deepEqual(options.features, []);
});
