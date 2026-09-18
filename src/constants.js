export const APP_TYPES = [
  "sveltekit",
  "flutter",
  "python",
  "go",
  "rust",
  "tauri",
  "custom",
];

export const FEATURES = ["supabase", "caddy", "ci"];
export const PACKAGE_MANAGERS = ["pnpm", "npm", "yarn", "bun"];

export const DEFAULTS = Object.freeze({
  apps: ["sveltekit"],
  features: [...FEATURES],
  packageManager: "pnpm",
  git: true,
});

export const APP_DEFAULT_NAMES = Object.freeze({
  sveltekit: "web",
  flutter: "mobile",
  python: "api-python",
  go: "api-go",
  rust: "api-rust",
  tauri: "desktop",
  custom: "custom",
});
