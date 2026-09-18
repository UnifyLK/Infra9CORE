import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export async function pathExists(target) {
  try { await stat(target); return true; } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export async function assertDestination(target, force) {
  if (!(await pathExists(target))) return;
  const entries = await readdir(target);
  if (entries.length && !force) {
    throw new Error(`Destination is not empty: ${target}. Use --force only after reviewing it.`);
  }
}

export async function copyPath(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, preserveTimestamps: true });
}

export async function writeText(target, content, mode) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content.endsWith("\n") ? content : `${content}\n`, { mode });
}

export async function replaceInFile(target, replacements) {
  let content = await readFile(target, "utf8");
  for (const [from, to] of replacements) content = content.replaceAll(from, to);
  await writeFile(target, content);
}
