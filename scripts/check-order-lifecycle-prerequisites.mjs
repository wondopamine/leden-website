#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const EXPECTED_SUPABASE_VERSION = "2.115.0";
const EXPECTED_VITEST_VERSION = "4.1.11";
const EXPECTED_BOOTSTRAP_CHECKSUM =
  "85fd583a19be476b1130ab505bd2829f0324c1f621d46b38b14fd1ec6a3fcdb3";

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function checkFiles(workspaceRoot) {
  const requiredFiles = [
    "supabase/config.toml",
    "supabase/seed.sql",
    "supabase/bootstrap/environment-sentinel.sql",
    "supabase/bootstrap/environment-sentinel.sha256",
    "supabase/tests/001_environment_contract.test.sql",
    "scripts/cleanup-lifecycle-test.mjs",
  ];
  const missing = [];
  for (const relativePath of requiredFiles) {
    if (!(await fileExists(join(workspaceRoot, relativePath)))) {
      missing.push(relativePath);
    }
  }
  return missing;
}

async function main() {
  const workspaceRoot = process.cwd();
  const diagnostics = [];
  const [nodeMajor = 0, nodeMinor = 0] = process.versions.node
    .split(".")
    .map((part) => Number.parseInt(part, 10));
  const supportedNode =
    nodeMajor > 20 || (nodeMajor === 20 && nodeMinor >= 19);
  diagnostics.push({
    check: "node",
    ok: supportedNode,
    detail: `Node ${process.versions.node}; requires >=20.19 for Vitest 4`,
  });

  const packageJson = JSON.parse(
    await readFile(join(workspaceRoot, "package.json"), "utf8")
  );
  diagnostics.push({
    check: "supabase-cli-pin",
    ok: packageJson.devDependencies?.supabase === EXPECTED_SUPABASE_VERSION,
    detail: `expected ${EXPECTED_SUPABASE_VERSION}`,
  });
  diagnostics.push({
    check: "vitest-pin",
    ok: packageJson.devDependencies?.vitest === EXPECTED_VITEST_VERSION,
    detail: `expected ${EXPECTED_VITEST_VERSION}`,
  });

  const missingFiles = await checkFiles(workspaceRoot);
  diagnostics.push({
    check: "u1-files",
    ok: missingFiles.length === 0,
    detail:
      missingFiles.length === 0
        ? "all required U1 local files exist"
        : `missing: ${missingFiles.join(", ")}`,
  });

  const bootstrap = await readFile(
    join(workspaceRoot, "supabase/bootstrap/environment-sentinel.sql")
  );
  const actualChecksum = createHash("sha256").update(bootstrap).digest("hex");
  diagnostics.push({
    check: "sentinel-checksum",
    ok: actualChecksum === EXPECTED_BOOTSTRAP_CHECKSUM,
    detail: actualChecksum,
  });

  const docker = spawnSync(
    "docker",
    ["version", "--format", "{{.Server.Version}}"],
    { encoding: "utf8" }
  );
  diagnostics.push({
    check: "docker-daemon",
    ok: docker.status === 0 && docker.stdout.trim().length > 0,
    detail:
      docker.status === 0
        ? `Docker ${docker.stdout.trim()}`
        : "Docker-compatible daemon is not reachable; start Docker/Colima before local reset",
  });

  console.log(JSON.stringify({ diagnostics }, null, 2));
  if (diagnostics.some((diagnostic) => !diagnostic.ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Lifecycle prerequisite check failed unexpectedly."
  );
  process.exitCode = 1;
});
