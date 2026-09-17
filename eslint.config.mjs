import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This app fetches from Supabase in client-component useEffects (standard
      // "load on mount" pattern). The new react-hooks compiler lint flags any
      // effect that transitively calls setState as an error, even after an
      // await. Downgraded to a warning rather than reworking data-fetching
      // into a suspense/`use()` pattern for this MVP.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
