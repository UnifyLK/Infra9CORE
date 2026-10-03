import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_DEFAULT_NAMES } from "./constants.js";
import { copyPath } from "./files.js";
import { runCommand } from "./process.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appTemplates = path.join(packageRoot, "templates/apps");
const textExtensions = new Set([
  ".css", ".dart", ".go", ".html", ".js", ".json", ".kt", ".md", ".plist",
  ".mod", ".properties", ".py", ".rs", ".svelte", ".svg", ".toml", ".ts", ".xcconfig",
  ".xml", ".yaml", ".yml",
]);

async function renderDirectory(directory, variables) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await renderDirectory(target, variables);
      continue;
    }
    if (!textExtensions.has(path.extname(entry.name)) && entry.name !== "Dockerfile") continue;
    let content = await readFile(target, "utf8");
    for (const [token, value] of Object.entries(variables)) {
      content = content.replaceAll(`{{${token}}}`, value);
    }
    await writeFile(target, content);
  }
}

export async function createApplications(root, appTypes, projectName, projectSlug, options = {}) {
  const created = [];
  const variables = {
    PROJECT_NAME: projectName,
    PROJECT_SLUG: projectSlug,
    PROJECT_SNAKE: projectSlug.replaceAll("-", "_"),
    PROJECT_COMPACT: projectSlug.replaceAll("-", ""),
    ORGANIZATION_ID: options.organizationId ?? "com.example",
  };

  for (const type of appTypes) {
    const name = APP_DEFAULT_NAMES[type];
    const destination = path.join(root, "apps", name);
    if (type === "flutter" && options.scaffoldSdks !== false) {
      await runCommand("flutter", [
        "create",
        "--project-name", `${variables.PROJECT_SNAKE}_mobile`,
        "--org", variables.ORGANIZATION_ID,
        "--platforms", options.flutterPlatforms.join(","),
        "--no-pub",
        destination,
      ], root);
    }
    await copyPath(path.join(appTemplates, type), destination);
    await renderDirectory(destination, variables);
    created.push({ type, name });
  }
  return created;
}
