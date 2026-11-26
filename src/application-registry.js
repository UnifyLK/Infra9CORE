import path from "node:path";

const idPattern = /^[a-z][a-z0-9-]{2,62}$/;
const relativeAppPath = /^apps\/(?:[a-z0-9][a-z0-9-]*\/)*[a-z0-9][a-z0-9-]*$/;

export function validateApplicationRegistration(registration) {
  const findings = [];
  if (!registration || typeof registration !== "object" || Array.isArray(registration)) return ["registration must be an object"];
  if (registration.schemaVersion !== 1) findings.push("registration schemaVersion must be 1");
  if (typeof registration.id !== "string" || !idPattern.test(registration.id)) findings.push("registration id must be a lowercase kebab-case identifier (3-63 characters)");
  if (typeof registration.path !== "string" || !relativeAppPath.test(registration.path)) findings.push("registration path must be a relative apps/ path without traversal");
  if (typeof registration.type !== "string" || !registration.type) findings.push("registration type is required");
  for (const field of ["capabilities", "dependencies"]) {
    if (!Array.isArray(registration[field]) || registration[field].some((item) => typeof item !== "string" || !item) || new Set(registration[field]).size !== registration[field].length) {
      findings.push(`registration ${field} must be a unique string array`);
    }
  }
  // Legacy Firebase mappings are tolerated so existing projects remain
  // readable. New registrations never create them; topology is consumer-owned.
  return findings;
}

export function validateApplicationRegistrationSet(registrations) { return []; }

export function registrationFileName(id) { return `${id}.json`; }

export function createApplicationRegistration({ id, appPath, type, capabilities = [], dependencies = [] }) {
  return { schemaVersion: 1, id, path: appPath, type, capabilities, dependencies };
}

export function resolveRegistrationPath(root, registration) {
  return path.resolve(root, registration.path);
}
