export function assertSupportedNode(version = process.versions.node) {
  const major = Number(version.split(".", 1)[0]);
  if (major !== 24) {
    throw new Error(`Infra9CORE requires Node.js 24.x; found ${version}.`);
  }
}
