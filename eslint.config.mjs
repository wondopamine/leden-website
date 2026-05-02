// eslint.config.mjs
//
// Phase 1 / Plan 05 / D-05, D-11:
// - Inline virtual plugin defines two rules enforcing token usage in src/.
// - Rule level is "error". No allowlist. No incremental ramp-up. First run on the
//   post-cutover codebase MUST exit 0 (D-11).
// - The hex regex is bounded to (3|6|8) chars + word boundary so HTML entities
//   like &#10003; do not trigger false positives (RESEARCH.md Pitfall 4).
//
// Smoke test the rule:
//   echo 'const X = "#FF0000";' >> src/app/[locale]/page.tsx
//   npm run lint   # exits non-zero, references #FF0000
//   git checkout -- src/app/[locale]/page.tsx

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Bounded hex regex — 3, 6, or 8 hex chars exactly + word boundary.
// (Per Pitfall 4: bare 5-digit decimal entities like &#10003; do not match.)
const HEX_LITERAL_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const HEX_EMBEDDED_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
// Tailwind arbitrary value: -[#abc], -[#abcdef], -[#abcdef12], with optional /opacity.
const ARB_HEX_RE = /-\[(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))(?:\/[0-9.]+)?\]/g;

const noRawHexLiteral = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw hex color literals; use brand tokens instead (var(--brand-*) or bg-brand-*).",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowlist: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      rawHex:
        "Raw hex {{value}} is not a brand token. Use a token from globals.css (e.g. var(--brand-forest-500)) or a Tailwind utility (e.g. bg-brand-forest-500).",
    },
  },
  create(context) {
    const opts = context.options[0] ?? {};
    const allowlist = new Set(opts.allowlist ?? []);
    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        if (!HEX_LITERAL_RE.test(node.value)) return;
        if (allowlist.has(node.value)) return;
        context.report({ node, messageId: "rawHex", data: { value: node.value } });
      },
      TemplateElement(node) {
        const v = node.value?.cooked ?? "";
        const matches = v.match(HEX_EMBEDDED_RE);
        if (!matches) return;
        for (const m of matches) {
          if (allowlist.has(m)) continue;
          context.report({ node, messageId: "rawHex", data: { value: m } });
        }
      },
    };
  },
};

const noArbitraryColorClass = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Tailwind arbitrary color values (e.g. bg-[#2D5A3D]); use brand tokens instead.",
    },
    schema: [],
    messages: {
      arbitrary:
        "Tailwind arbitrary color value {{match}} is not a brand token. Use a brand utility (e.g. bg-brand-forest-500).",
    },
  },
  create(context) {
    function checkString(node, str) {
      ARB_HEX_RE.lastIndex = 0;
      let match;
      while ((match = ARB_HEX_RE.exec(str)) !== null) {
        context.report({ node, messageId: "arbitrary", data: { match: match[0] } });
      }
    }
    return {
      JSXAttribute(node) {
        if (node.name?.name !== "className") return;
        const v = node.value;
        if (!v) return;
        if (v.type === "Literal" && typeof v.value === "string") {
          checkString(node, v.value);
        } else if (v.type === "JSXExpressionContainer") {
          const expr = v.expression;
          if (expr?.type === "Literal" && typeof expr.value === "string") {
            checkString(node, expr.value);
          }
          if (expr?.type === "TemplateLiteral") {
            for (const q of expr.quasis) {
              checkString(node, q.value?.cooked ?? "");
            }
          }
        }
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // Apply the two custom rules to customer + admin source.
  {
    files: [
      "src/app/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/lib/**/*.{ts,tsx}",
    ],
    plugins: {
      local: {
        rules: {
          "no-raw-hex": noRawHexLiteral,
          "no-arbitrary-color-class": noArbitraryColorClass,
        },
      },
    },
    rules: {
      // D-11: no brand-internal allowlist. First run on post-cutover codebase exits 0.
      "local/no-raw-hex": ["error", { allowlist: [] }],
      "local/no-arbitrary-color-class": "error",
    },
  },

  // File-scoped overrides — Task 2 chose override path for both files.
  // stickers.tsx: 16-color decorative SVG palette; Phase 3 page rebuild may retire it.
  // analytics-dashboard.tsx: recharts string props (#e7e5e4/#78716c) won't accept
  //   var(...) directly — vendor SVG attribute constraint (RESEARCH.md Pitfall 5).
  // Per RESEARCH.md Pitfall 5: cleaner than 50+ scattered eslint-disable comments.
  {
    files: [
      "src/components/stickers.tsx",
      "src/components/admin/analytics-dashboard.tsx",
    ],
    rules: {
      "local/no-raw-hex": "off",
      "local/no-arbitrary-color-class": "off",
    },
  },
]);

export default eslintConfig;
