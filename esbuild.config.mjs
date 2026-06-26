import esbuild from "esbuild";
import process from "process";

const prod = process.argv[2] === "production";

const builtins = [
  "assert", "buffer", "child_process", "crypto", "events",
  "fs", "http", "https", "net", "os", "path", "process",
  "querystring", "stream", "string_decoder", "timers",
  "tls", "tty", "url", "util", "zlib",
];

esbuild
  .build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: ["obsidian", "electron", ...builtins],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: "main.js",
    minify: prod,
  })
  .catch(() => process.exit(1));
