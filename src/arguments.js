import { parseArgs } from "node:util";
import { APP_TYPES, FEATURES, PACKAGE_MANAGERS } from "./constants.js";

function commaList(value) {
  if (value.trim().toLowerCase() === "none") return [];
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function assertAllowed(values, allowed, label) {
  const unknown = values.filter((value) => !allowed.includes(value));
  if (unknown.length) {
    throw new Error(`Unknown ${label}: ${unknown.join(", ")}. Allowed: ${allowed.join(", ")}`);
  }
}

export function parseCliArguments(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    allowNegative: true,
    strict: true,
    options: {
      name: { type: "string", short: "n" },
      apps: { type: "string", short: "a" },
      features: { type: "string", short: "f" },
      "package-manager": { type: "string", short: "p" },
      yes: { type: "boolean", short: "y", default: false },
      git: { type: "boolean", default: true },
      install: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
  });

  if (positionals.length > 1) throw new Error("Only one destination may be provided");
  const apps = values.apps ? commaList(values.apps) : undefined;
  const features = values.features ? commaList(values.features) : undefined;
  if (apps) assertAllowed(apps, APP_TYPES, "application type");
  if (features) assertAllowed(features, FEATURES, "feature");
  if (values["package-manager"] && !PACKAGE_MANAGERS.includes(values["package-manager"])) {
    throw new Error(`Unknown package manager: ${values["package-manager"]}`);
  }

  return {
    destination: positionals[0],
    projectName: values.name,
    apps,
    features,
    packageManager: values["package-manager"],
    yes: values.yes,
    git: values.git,
    install: values.install,
    dryRun: values["dry-run"],
    force: values.force,
    help: values.help,
    version: values.version,
  };
}
