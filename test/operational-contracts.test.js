import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { emitSarvaOpsPortAllocation } from '../src/operational-contracts.js';

test('emits a versioned SarvaOps allocation artifact without accepting overwrites', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'infra9core-contract-'));
  const output = path.join(directory, 'allocation.json');
  try {
    const contract = await emitSarvaOpsPortAllocation({ projectNumber: 12, environment: 'production', output });
    assert.equal(contract.ports.web, 12580);
    assert.match(contract.sha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')).ports, contract.ports);
    await assert.rejects(() => emitSarvaOpsPortAllocation({ projectNumber: 12, environment: 'production', output }), { code: 'EEXIST' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
