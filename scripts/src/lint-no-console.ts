import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Directories to recursively scan. We intentionally cover:
//  - server artifacts (where stray logs were the original problem)
//  - shared libs under `lib/**/src` (consumed by both server and client code)
//  - `scripts/src` (one-off CLI utilities; intentional prints must be
//    explicitly allowlisted with a `lint-no-console-disable` marker)
const TARGET_DIRS = [
  "artifacts/api-server/src",
  "artifacts/api-server-ba7r/src",
  "scripts/src",
];

// Each entry in `lib/` that has a `src/` directory is scanned too.
function discoverLibSrcDirs(): string[] {
  const libRoot = join(ROOT, "lib");
  let entries: string[];
  try {
    entries = readdirSync(libRoot);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const src = join(libRoot, entry, "src");
    try {
      if (statSync(src).isDirectory()) {
        out.push(relative(ROOT, src));
      }
    } catch {
      // no src/ — skip
    }
  }
  return out.sort();
}

const ALL_TARGETS = [...TARGET_DIRS, ...discoverLibSrcDirs()];

const FORBIDDEN = /\bconsole\s*\.\s*(log|error|warn|info|debug|trace)\b/;
const ALLOW_LINE = /eslint-disable-line\s+no-console|lint-no-console-disable/;
const ALLOW_FILE = /lint-no-console-disable-file/;
// Skip obvious comment lines so that JSDoc examples like
// `*  onComplete: (text) => console.log(...)` don't trip the scanner.
const COMMENT_LINE = /^\s*(\/\/|\*|\/\*)/;

const EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".turbo", ".next"]);

type Violation = { file: string; line: number; text: string };

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (st.isFile()) {
      const dot = entry.lastIndexOf(".");
      if (dot >= 0 && EXTS.has(entry.slice(dot))) out.push(full);
    }
  }
}

const violations: Violation[] = [];
for (const rel of ALL_TARGETS) {
  const abs = join(ROOT, rel);
  const files: string[] = [];
  walk(abs, files);
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (ALLOW_FILE.test(source)) continue;
    const lines = source.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (COMMENT_LINE.test(line)) continue;
      if (FORBIDDEN.test(line) && !ALLOW_LINE.test(line)) {
        violations.push({
          file: relative(ROOT, file),
          line: i + 1,
          text: line.trim(),
        });
      }
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(
    `lint-no-console: found ${violations.length} forbidden console.* call(s).\n` +
      `Use req.log in route handlers and the singleton logger elsewhere.\n` +
      `For intentional CLI prints, add a \`lint-no-console-disable-file\` marker\n` +
      `to the file or a \`lint-no-console-disable\` comment to the line.\n\n`,
  );
  for (const v of violations) {
    process.stderr.write(`  ${v.file}:${v.line}: ${v.text}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `lint-no-console: OK (scanned ${ALL_TARGETS.length} dir(s))\n`,
);
