// scripts/derive-radix-tokens.ts
//
// Generates Radix-methodology custom color scales (steps 1–12) for the three
// brand hues, seeded from the locked logo hexes. Replaces the old
// derive-tokens.ts, whose 50–900 OKLCH sweep pinned each anchor into a fixed
// -500 slot regardless of the anchor's real lightness, producing NON-MONOTONIC
// scales (forest-600 lighter than forest-500; cream-500 == cream-100) and
// AA-failing pairings.
//
// Method (Radix step semantics, light theme):
//   1–2  app / subtle background      7–8   borders / focus rings
//   3–5  component bg / hover / active 9–10  solid fill + hover
//   6    subtle border / separator    11–12 low- / high-contrast text
//
// Hue is held constant per scale; lightness ramps monotonically 1→12; chroma
// tapers at the light end and peaks near the solid step. The brand anchor is
// pinned exactly at its natural step (cream→2, forest→9, orange→9) so the
// wordmark hue survives while every UI token gets an APCA/WCAG-safe pairing.
//
// Run:  npx tsx scripts/derive-radix-tokens.ts        (prints CSS to stdout)
//       npx tsx scripts/derive-radix-tokens.ts --check (prints contrast report to stderr)

import { converter, formatHex, parse, wcagContrast } from "culori";

const toOklch = converter("oklch");

type ScaleSpec = {
  name: string;
  anchorHex: string;
  anchorStep: number; // 1-indexed step the brand hex is pinned to
  L: number[]; // 12 lightness targets, monotonic descending
  C: number[]; // 12 chroma targets
};

const A = (hex: string) => {
  const o = toOklch(parse(hex));
  if (!o) throw new Error(`parse ${hex}`);
  return o;
};

// Brand hues drive each scale; l/c at the anchor step are overwritten by the exact logo value.
const creamO = A("#EFE7D2"); // warm neutral  L~0.93 h~90
const forestO = A("#2F5436"); // green         L~0.40 h~157
const orangeO = A("#D9682E"); // warm orange   L~0.63 h~46

const SCALES: ScaleSpec[] = [
  {
    name: "cream",
    anchorHex: "#EFE7D2",
    anchorStep: 2,
    L: [0.978, 0.939, 0.906, 0.876, 0.844, 0.800, 0.742, 0.660, 0.575, 0.505, 0.415, 0.255],
    C: [0.006, 0.012, 0.014, 0.016, 0.018, 0.020, 0.022, 0.023, 0.024, 0.024, 0.026, 0.020],
  },
  {
    name: "forest",
    anchorHex: "#2F5436",
    anchorStep: 9,
    L: [0.968, 0.940, 0.900, 0.855, 0.800, 0.740, 0.665, 0.560, 0.404, 0.360, 0.318, 0.232],
    C: [0.010, 0.020, 0.030, 0.040, 0.050, 0.058, 0.064, 0.070, 0.074, 0.070, 0.062, 0.042],
  },
  {
    name: "orange",
    anchorHex: "#D9682E",
    anchorStep: 9,
    L: [0.976, 0.951, 0.913, 0.871, 0.826, 0.779, 0.722, 0.681, 0.630, 0.582, 0.520, 0.335],
    C: [0.018, 0.038, 0.060, 0.088, 0.110, 0.130, 0.150, 0.160, 0.157, 0.150, 0.135, 0.078],
  },
];

const HUE: Record<string, number> = {
  cream: creamO.h ?? 90,
  forest: forestO.h ?? 157,
  orange: orangeO.h ?? 46,
};
const ANCHOR_O: Record<string, ReturnType<typeof A>> = { cream: creamO, forest: forestO, orange: orangeO };

function buildScale(s: ScaleSpec): string[] {
  const hex: string[] = [];
  for (let i = 0; i < 12; i++) {
    let l = s.L[i];
    let c = s.C[i];
    const h = HUE[s.name];
    if (i + 1 === s.anchorStep) {
      // Pin the exact logo value at its natural step.
      l = ANCHOR_O[s.name].l;
      c = ANCHOR_O[s.name].c ?? c;
    }
    hex.push(formatHex({ mode: "oklch", l, c, h })!);
  }
  return hex;
}

const scales: Record<string, string[]> = {};
for (const s of SCALES) scales[s.name] = buildScale(s);

// ── stdout: the :root scale block ──────────────────────────────────────────
const today = "generated via scripts/derive-radix-tokens.ts";
let out = `  /* Radix-methodology custom scales (1–12), seeded from logo hexes. ${today} */\n`;
for (const s of SCALES) {
  out += `\n  /* --${s.name}-* — anchor ${s.anchorHex} pinned at step ${s.anchorStep} */\n`;
  scales[s.name].forEach((hx, i) => {
    const tag = i + 1 === s.anchorStep ? "   /* logo anchor */" : "";
    out += `  --${s.name}-${i + 1}: ${hx};${tag}\n`;
  });
}
process.stdout.write(out);

// ── stderr: validation report ──────────────────────────────────────────────
const check = process.argv.includes("--check");
if (check) {
  const err = (m: string) => process.stderr.write(m + "\n");
  err("\n=== MONOTONICITY (OKLCH L must strictly decrease 1→12) ===");
  for (const s of SCALES) {
    const ls = scales[s.name].map((h) => +(toOklch(parse(h))!.l).toFixed(4));
    let ok = true;
    for (let i = 1; i < 12; i++) if (ls[i] >= ls[i - 1]) ok = false;
    err(`  ${s.name.padEnd(7)} ${ok ? "PASS" : "FAIL"}  [${ls.join(", ")}]`);
  }

  const ratio = (fg: string, bg: string) => wcagContrast(fg, bg).toFixed(2);
  const line = (label: string, fg: string, bg: string, min: number) => {
    const r = +ratio(fg, bg);
    err(`  ${(r >= min ? "PASS" : "FAIL").padEnd(4)} ${r.toFixed(2).padStart(5)} (min ${min})  ${label}`);
  };
  const c = scales.cream, f = scales.forest, o = scales.orange;
  err("\n=== WCAG CONTRAST at semantic pairings ===");
  line("foreground forest-12 on background cream-2", f[11], c[1], 4.5);
  line("foreground forest-12 on card cream-1", f[11], c[0], 4.5);
  line("muted-foreground forest-11 on cream-2", f[10], c[1], 4.5);
  line("muted-foreground forest-11 on muted cream-3", f[10], c[2], 4.5);
  line("primary-foreground cream-1 on primary forest-9", c[0], f[8], 4.5);
  line("accent-foreground cream-1 on accent orange-9 (expect FAIL)", c[0], o[8], 4.5);
  line("accent-foreground forest-12 on accent orange-9", f[11], o[8], 4.5);
  line("price text orange-11 on cream-2", o[10], c[1], 4.5);
  line("price text orange-12 on cream-2", o[11], c[1], 4.5);
  line("border cream-6 on cream-2 (UI 3:1)", c[5], c[1], 3.0);
  line("border cream-7 on cream-1 (UI 3:1)", c[6], c[0], 3.0);
  line("ring orange-8 on cream-2 (UI 3:1)", o[7], c[1], 3.0);
  line("ring orange-8 on primary forest-9 (UI 3:1)", o[7], f[8], 3.0);
  line("forest-9 solid on cream-2 (UI 3:1)", f[8], c[1], 3.0);
  line("orange-9 solid on cream-2 (UI 3:1)", o[8], c[1], 3.0);
}
