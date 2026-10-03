const ENVIRONMENT_DIGITS = Object.freeze({
  production: 5,
  uat: 3,
  development: 2,
});

const SERVICE_OFFSETS = Object.freeze({
  web: 80,
  db: 7,
  studio: 8,
  api: 88,
  kong: 90,
});

export function deriveSarvaOpsPorts(projectNumber, environment) {
  if (!Number.isInteger(projectNumber) || projectNumber < 1 || projectNumber > 64) {
    throw new Error('SarvaOps project number must be an integer from 1 through 64');
  }
  const environmentDigit = ENVIRONMENT_DIGITS[environment];
  if (!environmentDigit) {
    throw new Error('SarvaOps environment must be production, uat, or development');
  }
  const port = (offset) => projectNumber * 1000 + environmentDigit * 100 + offset;
  return Object.freeze({
    web: port(SERVICE_OFFSETS.web),
    db: port(SERVICE_OFFSETS.db),
    studio: port(SERVICE_OFFSETS.studio),
    api: port(SERVICE_OFFSETS.api),
    kong: port(SERVICE_OFFSETS.kong),
  });
}

export function applySarvaOpsPortAllocation(deployment) {
  if (deployment.portAllocation?.provider !== 'sarvaops') return deployment;
  const ports = deriveSarvaOpsPorts(
    deployment.portAllocation.projectNumber,
    deployment.environment,
  );
  return {
    ...deployment,
    appPort: ports.web,
    postgresPort: ports.db,
    supabaseStudioPort: ports.studio,
    projectApiPort: ports.api,
    supabaseApiPort: ports.kong,
  };
}
