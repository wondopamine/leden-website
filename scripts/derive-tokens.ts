// scripts/derive-tokens.ts
//
// One-shot OKLCH lightness sweep that produces the brand color scale for
// src/app/globals.css. Per D-02 this is a checked-in script, not part of
// the build. Per D-03, ΔE76 ≤ 2 is verified here (manually, once) and
// recorded as a comment in globals.css.
//
// Run with: npx tsx scripts/derive-tokens.ts
//
// Output: stdout — copy the printed `--brand-...:` lines into the :root
// block of src/app/globals.css.

import { converter, formatHex, parse, differenceEuclidean } from "culori";

type Anchor = { name: string; hex: string };

// Logo anchors — locked per CONTEXT.md / SPEC.md.
const ANCHORS: Anchor[] = [
  { name: "cream",  hex: "#EFE7D2" },
  { name: "forest", hex: "#2F5436" },
  { name: "orange", hex: "#D9682E" },
];

// 9 lightness stops; index 4 is reserved for the anchor (the -500 position).
// Lightness values chosen empirically for editorial cafe palettes.
const LIGHTNESS: Record<string, number> = {
  "50":  0.97,
  "100": 0.93,
  "200": 0.86,
  "300": 0.78,
  "400": 0.68,
  "600": 0.50,
  "700": 0.40,
  "800": 0.28,
  "900": 0.18,
};

const toOklch  = converter("oklch");
// ΔE76 = Euclidean distance in CIELAB (RESEARCH.md Pitfall 1 — NOT "oklch").
const deltaE76 = differenceEuclidean("lab");

const today = new Date().toISOString().slice(0, 10);
console.log(`/* Brand color scale — derived ${today} via culori OKLCH lightness sweep */`);
console.log(`/* ΔE76 verified ≤ 2 at every anchor's -500 stop (CIELAB Euclidean distance). */`);

for (const anchor of ANCHORS) {
  const oklchAnchor = toOklch(parse(anchor.hex));
  if (!oklchAnchor) throw new Error(`Failed to parse ${anchor.hex}`);

  console.log(`\n/* --brand-${anchor.name}-* (anchor ${anchor.hex} at -500) */`);

  for (const [stop, L] of Object.entries(LIGHTNESS)) {
    const swept = { ...oklchAnchor, l: L };
    const hex = formatHex(swept);
    if (stop === "500") continue; // 500 is emitted from the anchor itself below
    console.log(`  --brand-${anchor.name}-${stop}: ${hex};`);
  }

  // 500 = the anchor itself (re-emit at original hex, then verify round-trip).
  const fiveHundredHex = formatHex(oklchAnchor);
  const dE = deltaE76(parse(anchor.hex), parse(fiveHundredHex));
  console.log(`  --brand-${anchor.name}-500: ${fiveHundredHex};   /* ΔE76 vs anchor: ${dE.toFixed(3)} */`);

  if (dE > 2) {
    throw new Error(`Anchor ${anchor.name} round-trip ΔE76 = ${dE.toFixed(3)} > 2 (acceptance threshold per SPEC.md REQ 1)`);
  }
}
