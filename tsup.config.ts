import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  clean: true,
  // Prepend a shebang so the built bin is directly executable.
  banner: { js: "#!/usr/bin/env node" },
});
