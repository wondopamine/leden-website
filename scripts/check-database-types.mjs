#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const typesPath = join(
  process.cwd(),
  "src",
  "lib",
  "supabase",
  "database.types.ts"
);
const generated = execFileSync(
  "npx",
  ["supabase", "gen", "types", "typescript", "--local", "--schema", "public"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
);
const committed = readFileSync(typesPath, "utf8");
const normalizeGeneratedFile = (value) => `${value.replaceAll("\r\n", "\n").trimEnd()}\n`;

if (normalizeGeneratedFile(generated) !== normalizeGeneratedFile(committed)) {
  console.error(
    "Generated public database types differ from src/lib/supabase/database.types.ts. Reset the local schema, regenerate with the pinned Supabase CLI, and commit the result."
  );
  process.exitCode = 1;
} else {
  console.log("Generated public database types match the committed contract.");
}
