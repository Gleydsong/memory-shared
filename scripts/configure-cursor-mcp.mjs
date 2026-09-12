#!/usr/bin/env node
import { chmod, readFile, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(homedir(), ".cursor", "mcp.json");
const raw = await readFile(configPath, "utf8");
const config = JSON.parse(raw);

if (!config || typeof config !== "object" || Array.isArray(config)) {
  throw new Error("Cursor MCP config root must be an object");
}
if (!config.mcpServers || typeof config.mcpServers !== "object" || Array.isArray(config.mcpServers)) {
  throw new Error("Cursor MCP config must contain an mcpServers object");
}

const desired = {
  command: join(repoRoot, "scripts", "cursor-shared-memory-mcp.zsh"),
};
const existing = config.mcpServers.shared_memory;
if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(desired)) {
  throw new Error("Refusing to overwrite an existing Cursor shared_memory MCP entry");
}
config.mcpServers.shared_memory = desired;

const indentation = raw.includes("\n    \"") ? 4 : 2;
const mode = (await stat(configPath)).mode;
const temporaryPath = join(dirname(configPath), `.mcp.json.shared-memory-${process.pid}.tmp`);
await writeFile(temporaryPath, `${JSON.stringify(config, null, indentation)}\n`, { mode });
await chmod(temporaryPath, mode);
await rename(temporaryPath, configPath);

process.stdout.write("Added Cursor shared_memory MCP using SHARED_MEMORY_COMPOSER_KEY.\n");
