import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { APP_TYPES, DEFAULTS, FEATURES, PACKAGE_MANAGERS } from "./constants.js";

function list(value) {
  return value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

async function ask(rl, message, fallback) {
  const answer = (await rl.question(`${message} (${fallback}): `)).trim();
  return answer || fallback;
}

export async function collectInteractiveOptions(initial) {
  if (initial.yes) return initial;
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Interactive input is unavailable; pass --yes or all required options");
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const destination = initial.destination ?? await ask(rl, "Destination directory", "my-product");
    const projectName = initial.projectName ?? await ask(rl, "Project name", destination.split("/").at(-1));
    const apps = initial.apps ?? list(await ask(
      rl,
      `Applications [${APP_TYPES.join(", ")}]`,
      DEFAULTS.apps.join(","),
    ));
    const features = initial.features ?? list(await ask(
      rl,
      `Infrastructure [${FEATURES.join(", ")}]`,
      DEFAULTS.features.join(","),
    ));
    const packageManager = initial.packageManager ?? await ask(
      rl,
      `Package manager [${PACKAGE_MANAGERS.join(", ")}]`,
      DEFAULTS.packageManager,
    );
    const installAnswer = initial.install || (await ask(rl, "Install JavaScript dependencies? [y/N]", "N"));
    return {
      ...initial,
      destination,
      projectName,
      apps,
      features,
      packageManager,
      install: initial.install || /^y(es)?$/i.test(installAnswer),
    };
  } finally {
    rl.close();
  }
}
