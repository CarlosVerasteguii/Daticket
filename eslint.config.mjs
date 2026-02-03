import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-local/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Tooling / agent scaffolding (not product code):
    ".agents/**",
    ".agent/**",
    ".bmad-core/**",
    "_bmad/**",
    "_bmad-output/**",
    ".codex/**",
    ".cursor/**",
    ".opencode/**",
    ".playwright-mcp/**",
    ".claude/**",
    ".gemini/**",
    ".qoder/**",
    ".qwen/**",

    // Repo metadata / editor settings:
    ".github/**",
    ".vscode/**",

    // Docs and bundles (not shipped runtime code):
    "docs/**",
    "web-bundles/**",
  ]),
  {
    rules: {
      // This rule is currently too aggressive for common patterns like data fetching in `useEffect`.
      // Keep other hooks rules enabled, but don't fail lint on this one.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
