import assert from "node:assert/strict";
import test from "node:test";
import { applySarvaOpsPortAllocation, deriveSarvaOpsPorts } from "../src/sarvaops-ports.js";

test("derives the SarvaOps P-E-SS host-port contract", () => {
  assert.deepEqual(deriveSarvaOpsPorts(12, "production"), {
    web: 12580, db: 12507, studio: 12508, api: 12588, kong: 12590,
  });
  assert.equal(deriveSarvaOpsPorts(12, "development").web, 12280);
  assert.throws(() => deriveSarvaOpsPorts(0, "production"));
  assert.throws(() => deriveSarvaOpsPorts(12, "preview"));
});

test("applies SarvaOps ports only when the deployment opts into that provider", () => {
  const deployment = { environment: "production", portAllocation: { provider: "sarvaops", projectNumber: 12 } };
  assert.equal(applySarvaOpsPortAllocation(deployment).appPort, 12580);
  assert.equal(applySarvaOpsPortAllocation({ appPort: 3100, portAllocation: { provider: "direct" } }).appPort, 3100);
});
