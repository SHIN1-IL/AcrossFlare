import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='dynamic'] Property[key.name='ssr'][value.value=false]",
          message:
            "ssr: false is not allowed in src/app. Put next/dynamic in a client wrapper under src/components.",
        },
        {
          selector:
            "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name='revalidate'][init.type!='Literal']",
          message:
            "export const revalidate must be a numeric literal or false. Next cannot follow imported constants at build time.",
        },
        {
          selector:
            "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name='dynamic'][init.type!='Literal']",
          message:
            "export const dynamic must be a string literal such as \"force-static\" or \"force-dynamic\".",
        },
      ],
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
