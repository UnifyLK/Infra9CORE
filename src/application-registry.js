import path from "node:path";

const idPattern = /^[a-z][a-z0-9-]{2,62}$/;
const relativeAppPath = /^apps\/(?:[a-z0-9][a-z0-9-]*\/)*[a-z0-9][a-z0-9-]*$/;
const firestoreDatabasePattern = /^(?:\(default\)|[a-z][a-z0-9-]{2,62})$/;
const hostingSitePattern = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/;
const relativePublicPath = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9._/-]+$/;

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
  const firebase = registration.firebase;
  if (firebase !== undefined) {
    if (!firebase || typeof firebase !== "object" || Array.isArray(firebase)) findings.push("registration firebase mapping must be an object");
    else {
      for (const key of ["firestoreDatabase", "functionsCodebase", "hostingTarget", "hostingSite", "hostingPublic"]) {
        if (firebase[key] !== undefined && (typeof firebase[key] !== "string" || !firebase[key])) findings.push(`registration firebase ${key} must be a non-empty string when supplied`);
      }
      if (firebase.firestoreDatabase && !firestoreDatabasePattern.test(firebase.firestoreDatabase)) findings.push("registration Firebase firestoreDatabase is not a valid database identifier");
      if (firebase.functionsCodebase && !idPattern.test(firebase.functionsCodebase)) findings.push("registration Firebase functionsCodebase must be a lowercase kebab-case identifier (3-63 characters)");
      if (firebase.hostingTarget && !idPattern.test(firebase.hostingTarget)) findings.push("registration Firebase hostingTarget must be a lowercase kebab-case identifier (3-63 characters)");
      if (firebase.hostingSite && !hostingSitePattern.test(firebase.hostingSite)) findings.push("registration Firebase hostingSite is not a valid hostname label (1-30 characters)");
      if (firebase.hostingPublic && !relativePublicPath.test(firebase.hostingPublic)) findings.push("registration Firebase hostingPublic must be a relative path without traversal");
      if ((firebase.hostingTarget === undefined) !== (firebase.hostingSite === undefined)) findings.push("registration Firebase hostingTarget and hostingSite must be supplied together");
      if (firebase.hostingTarget && !firebase.hostingPublic) findings.push("registration Firebase hostingPublic is required with a Hosting target");
    }
  }
  return findings;
}

export function validateApplicationRegistrationSet(registrations) {
  const findings = [];
  const claimed = new Map();
  for (const registration of registrations) {
    for (const [field, value] of Object.entries(registration.firebase ?? {})) {
      if (!(["firestoreDatabase", "functionsCodebase", "hostingTarget", "hostingSite"].includes(field)) || !value) continue;
      const key = `${field}:${value}`;
      if (claimed.has(key)) findings.push(`Firebase ${field} is claimed by both ${claimed.get(key)} and ${registration.id}`);
      else claimed.set(key, registration.id);
    }
  }
  return findings;
}

export function registrationFileName(id) { return `${id}.json`; }

export function createApplicationRegistration({ id, appPath, type, capabilities = [], dependencies = [] }) {
  return { schemaVersion: 1, id, path: appPath, type, capabilities, dependencies };
}

export function resolveRegistrationPath(root, registration) {
  return path.resolve(root, registration.path);
}
