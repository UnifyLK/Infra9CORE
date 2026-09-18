import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_DEFAULT_NAMES } from "./constants.js";
import { copyPath } from "./files.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appTemplates = path.join(packageRoot, "templates/apps");

async function renderDirectory(directory, variables) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await renderDirectory(target, variables);
      continue;
    }
    let content = await readFile(target, "utf8");
    for (const [token, value] of Object.entries(variables)) {
      content = content.replaceAll(`{{${token}}}`, value);
    }
    await writeFile(target, content);
  }
}

export async function createApplications(root, appTypes, projectName, projectSlug) {
  const created = [];
  const variables = {
    PROJECT_NAME: projectName,
    PROJECT_SLUG: projectSlug,
    PROJECT_SNAKE: projectSlug.replaceAll("-", "_"),
  };

  for (const type of appTypes) {
    const name = APP_DEFAULT_NAMES[type];
    const destination = path.join(root, "apps", name);
    await copyPath(path.join(appTemplates, type), destination);
    await renderDirectory(destination, variables);
    created.push({ type, name });
  }
  return created;
}
