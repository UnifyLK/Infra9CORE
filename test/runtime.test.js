import assert from "node:assert/strict";
import test from "node:test";
import { assertSupportedNode } from "../src/runtime.js";

test("requires Node.js 24", () => {
  assert.doesNotThrow(() => assertSupportedNode("24.21.0"));
  for (const version of ["20.19.0", "22.21.0", "23.0.0", "25.0.0"]) {
    assert.throws(() => assertSupportedNode(version), /requires Node\.js 24\.x/);
  }
});
