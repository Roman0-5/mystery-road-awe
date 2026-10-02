import { defineConfig } from "vite";

// Relative base: the built app works under any sub-path, e.g. GitHub Pages serves this repo at
// https://<user>.github.io/<repo>/, where absolute URLs like "/data/case.json" would 404.
export default defineConfig({
  base: "./",
});
