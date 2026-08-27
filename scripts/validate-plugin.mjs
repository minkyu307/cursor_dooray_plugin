#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const errors = [];
const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

function addError(message) {
  errors.push(message);
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return null;
  }
  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return null;
  }
  const fields = {};
  for (const line of normalized.slice(4, closingIndex).split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1 || !line.trim() || line.trim().startsWith("#")) {
      continue;
    }
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

async function walk(dir) {
  const files = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else {
        files.push(entryPath);
      }
    }
  }
  return files;
}

async function validateFrontmatter(dir, required, kind) {
  if (!(await pathExists(dir))) {
    return;
  }
  for (const file of await walk(dir)) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file);
    const check =
      kind === "skill"
        ? base === "SKILL.md"
        : [".md", ".mdc", ".markdown", ".txt"].includes(ext);
    if (!check) {
      continue;
    }
    const parsed = parseFrontmatter(await fs.readFile(file, "utf8"));
    if (!parsed) {
      addError(`${kind} missing YAML frontmatter: ${path.relative(root, file)}`);
      continue;
    }
    for (const key of required) {
      if (!parsed[key]) {
        addError(`${kind} missing "${key}": ${path.relative(root, file)}`);
      }
    }
  }
}

const manifestPath = path.join(root, ".cursor-plugin/plugin.json");
const raw = await fs.readFile(manifestPath, "utf8");
const manifest = JSON.parse(raw);
if (!pluginNamePattern.test(manifest.name)) {
  addError('plugin.json "name" must be lowercase kebab-case');
}
if (manifest.logo && !(await pathExists(path.join(root, manifest.logo)))) {
  addError(`logo missing: ${manifest.logo}`);
}
if (!(await pathExists(path.join(root, "mcp.json")))) {
  addError("mcp.json is missing");
}
if (!(await pathExists(path.join(root, "dist/server.js")))) {
  addError("dist/server.js is missing. Run npm run build.");
}

await validateFrontmatter(path.join(root, "rules"), ["description"], "rule");
await validateFrontmatter(path.join(root, "skills"), ["name", "description"], "skill");
await validateFrontmatter(path.join(root, "agents"), ["name", "description"], "agent");
await validateFrontmatter(path.join(root, "commands"), ["name", "description"], "command");

if (errors.length > 0) {
  console.error("Validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Validation passed.");
