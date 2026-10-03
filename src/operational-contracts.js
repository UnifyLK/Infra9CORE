import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { deriveSarvaOpsPorts } from './sarvaops-ports.js';
import { packageVersion } from './generator.js';

export async function emitSarvaOpsPortAllocation({ projectNumber, environment, output }) {
  const ports = deriveSarvaOpsPorts(projectNumber, environment);
  const payload = {
    schemaVersion: 1,
    contract: 'sarvaops-p-e-ss-port-allocation',
    generator: { package: '@unifyit/create-infra9core', version: await packageVersion() },
    projectNumber,
    environment,
    ports,
  };
  const canonical = JSON.stringify(payload);
  const document = { ...payload, sha256: createHash('sha256').update(canonical).digest('hex') };
  await writeFile(output, `${JSON.stringify(document, null, 2)}\n`, { flag: 'wx' });
  return document;
}
