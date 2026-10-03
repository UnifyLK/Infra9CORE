const environmentDigits = Object.freeze({ production: 5, uat: 3, development: 2 });

export function deriveSarvaOpsPorts(projectNumber, environment) {
  if (!Number.isInteger(projectNumber) || projectNumber < 1 || projectNumber > 64) {
    throw new Error('SarvaOps project number must be an integer from 1 through 64');
  }
  const environmentDigit = environmentDigits[environment];
  if (!environmentDigit) throw new Error('SarvaOps environment must be production, uat, or development');
  const port = (offset) => projectNumber * 1000 + environmentDigit * 100 + offset;
  return Object.freeze({ web: port(80), db: port(7), studio: port(8), api: port(88), kong: port(90) });
}

export function applySarvaOpsPortAllocation(deployment) {
  if (deployment.portAllocation?.provider !== 'sarvaops') return deployment;
  const ports = deriveSarvaOpsPorts(deployment.portAllocation.projectNumber, deployment.environment);
  return { ...deployment, appPort: ports.web, postgresPort: ports.db, supabaseStudioPort: ports.studio, projectApiPort: ports.api, supabaseApiPort: ports.kong };
}
