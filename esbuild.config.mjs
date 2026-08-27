import esbuild from "esbuild";
import process from "node:process";
import { fileURLToPath } from "node:url";

const production = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  // the engine ships TypeScript source; bundle it directly
  alias: {
    "@scriptwizards/perhaps-engine": fileURLToPath(
      new URL("./node_modules/@scriptwizards/perhaps-engine/src/index.ts", import.meta.url),
    ),
  },
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
});

if (production) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
