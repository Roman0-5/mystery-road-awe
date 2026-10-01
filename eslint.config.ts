// ---------------------------------------------------------------------
// lint vs. lint:fix
// ---------------------------------------------------------------------
//
//   A rule gets an autofixer ONLY when there is exactly one mechanical,
//   meaning-preserving way to rewrite the violation. If fixing it requires
//   understanding what the code is trying to do, there is no fixer, on purpose. 
//
// When does running lint:fix actually make sense?
//   1. Right before a commit, as a habit.
//   2. Right after you (or a teammate) turn ON a new rule in this file
//      for a codebase that already exists.
//   3. After a big refactor/rename, to clean up leftover style drift
//      before review, not `var`->`let` noise.
//
// When does it NOT make sense?
//   1. In CI. Ever. 
//   2. On code you haven't read yet. --fix is safe by rule design, but
//      "safe" means "meaning-preserving for well-formed code". Always
//      diff and re-test after running it, don't blindly trust it.
//   3. As a substitute for actually understanding a warning. 
// ---------------------------------------------------------------------

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // -----------------------------------------------------------------
      // FIXABLE: where lint:fix actually fixes something
      // -----------------------------------------------------------------

      // BEFORE:  var count = 0;
      // AFTER:   let count = 0;
      "no-var": "error",
      // BEFORE:  let name = "Nova Byte";  // never reassigned anywhere
      // AFTER:   const name = "Nova Byte";
      "prefer-const": "error",
      // BEFORE:  if (status == "open")
      // AFTER:   if (status === "open")
      eqeqeq: ["error", "smart"],
      // BEFORE:  list.indexOf(x) !== -1
      // AFTER:   list.includes(x)
      "@typescript-eslint/prefer-includes": "error",
      // BEFORE:  (value as Evidence[]).find(...)   // value is ALREADY Evidence[]
      // AFTER:   value.find(...)
      "@typescript-eslint/no-unnecessary-type-assertion": "error",

      // -----------------------------------------------------------------
      // NOT FIXABLE: the "correct" rewrite depends on semantics that only dev can decide.
      // -----------------------------------------------------------------

      // The variable might be unused because of a typo two
      // lines away (the REAL fix is using it, not deleting it), or it
      // might be genuinely dead code. ESLint can't tell those apart, so
      // it reports and stops.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // example: function handle(payload: any) { ... }
      // There is no "correct" type ESLint could substitute for `any` -
      "@typescript-eslint/no-explicit-any": "error",
    },
  },

  // Must be last: turns off every ESLint *stylistic* rule that would
  // otherwise disagree with Prettier's formatting. Prettier owns
  // formatting; ESLint owns correctness/quality. Two tools, one job each.
  prettier
);
