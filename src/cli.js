import { parseCliArguments } from "./arguments.js";
import { collectInteractiveOptions } from "./prompt.js";
import { describePlan, generateProject, normalizeOptions, packageVersion } from "./generator.js";

const HELP = `Infra9CORE - production-minded multi-stack repository generator

Usage:
  create-infra9core [destination] [options]

Options:
  -n, --name <name>               Project display name
  -a, --apps <list>               sveltekit,flutter,python,go,rust,tauri,custom
  -f, --features <list>           supabase,caddy,ci
  -p, --package-manager <name>    pnpm, npm, yarn, or bun
  -y, --yes                       Accept defaults; disable prompts
      --install                   Install JavaScript dependencies
      --no-git                    Do not initialize a Git repository
      --dry-run                   Print the generation plan without writing
      --force                     Allow generation into a non-empty directory
  -v, --version                   Print version
  -h, --help                      Show this help

Example:
  npx @unifyit/create-infra9core@latest my-product --apps sveltekit,flutter,python
`;

export async function run(argv) {
  const parsed = parseCliArguments(argv);
  if (parsed.help) { console.log(HELP); return; }
  if (parsed.version) { console.log(await packageVersion()); return; }
  const answers = await collectInteractiveOptions(parsed);
  const config = normalizeOptions(answers);
  console.log(`\n${describePlan(config)}\n`);
  const result = await generateProject(config);
  if (result.created) {
    console.log(`Infra9CORE created ${result.config.projectName} at ${result.config.destination}`);
    console.log("Review the generated ADR and environment template before starting services.");
  } else {
    console.log("Dry run complete; no files were written.");
  }
}
