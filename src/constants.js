export const APP_TYPES = [
  "sveltekit",
  "flutter",
  "python",
  "go",
  "rust",
  "tauri",
  "custom",
];

export const FEATURES = ["ci"];
export const PACKAGE_MANAGERS = ["pnpm", "npm", "yarn", "bun"];

// Turborepo requires a package-manager declaration for every JavaScript
// workspace, not only pnpm workspaces. Pinning it also makes the first
// dependency resolution deterministic once the generated lockfile is committed.
export const PACKAGE_MANAGER_VERSIONS = Object.freeze({
  pnpm: "10.15.1",
  npm: "11.19.0",
  yarn: "4.18.0",
  bun: "1.4.2",
});
export const FLUTTER_PLATFORMS = ["android", "ios", "web", "linux", "macos", "windows"];

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
