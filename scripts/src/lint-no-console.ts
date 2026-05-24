import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TARGET_DIRS = [
  "artifacts/api-server/src",
  "artifacts/api-server-ba7r/src",
];

const FORBIDDEN = /\bconsole\s*\.\s*(log|error|warn|info|debug|trace)\b/;
const ALLOW_LINE = /eslint-disable-line\s+no-console|lint-no-console-disable/;

const EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

type Violation = { file: string; line: number; text: string };

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
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
for (const rel of TARGET_DIRS) {
  const abs = join(ROOT, rel);
  const files: string[] = [];
  walk(abs, files);
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
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
    `lint-no-console: found ${violations.length} forbidden console.* call(s) in server code.\n` +
      `Use req.log in route handlers and the singleton logger elsewhere.\n\n`,
  );
  for (const v of violations) {
    process.stderr.write(`  ${v.file}:${v.line}: ${v.text}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `lint-no-console: OK (scanned ${TARGET_DIRS.join(", ")})\n`,
);
