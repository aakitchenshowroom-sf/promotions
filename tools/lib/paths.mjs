// Locations: the repo knows only where the workspace is (local.config.json, never committed).
// The workspace holds config/active.json, data/promos.json, data/fingerprints.json and notes.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const repoDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
}

export function locations() {
  const localPath = join(repoDir, "local.config.json");
  // PROMO_WORKSPACE points the tools at a throwaway copy (used by tools/test-public.mjs).
  let workspace = process.env.PROMO_WORKSPACE;
  if (!workspace) {
    if (!existsSync(localPath)) {
      throw new Error(`Missing ${localPath}. It holds {"workspace": "<path to Promo site data>"} and is not committed.`);
    }
    workspace = readJson(localPath).workspace;
  }
  const active = readJson(join(workspace, "config", "active.json"));
  return {
    workspace,
    active,
    root: active.root,
    promosPath: join(workspace, "data", "promos.json"),
    fingerprintsPath: join(workspace, "data", "fingerprints.json"),
  };
}

// "2026/Black Friday Rebate" + "Bosch/x.pdf" -> path under the Promo root
export function sourcePath(root, folder, file) {
  return join(root, ...folder.split("/"), ...file.split("/"));
}
