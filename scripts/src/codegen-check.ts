/**
 * Verify generated API client code is up-to-date with the OpenAPI spec.
 *
 * Runs `pnpm --filter @workspace/api-spec run codegen` and fails if the
 * resulting `git diff` is non-empty. Catches "forgot to regenerate" PRs.
 *
 * Run: `pnpm run codegen:check`
 */
import { execSync } from "node:child_process";

function run(cmd: string): string {
  return execSync(cmd, { stdio: ["ignore", "pipe", "inherit"] }).toString();
}

try {
  console.log("codegen-check: running codegen...");
  execSync("pnpm --filter @workspace/api-spec run codegen", {
    stdio: "inherit",
  });

  const diff = run(
    "git diff --name-only -- ':!pnpm-lock.yaml' ':!**/node_modules/**'",
  ).trim();

  if (diff.length === 0) {
    console.log("codegen-check: OK — generated code is up-to-date.");
    process.exit(0);
  }

  console.error(
    "codegen-check: FAIL — generated code is stale. Run " +
      "`pnpm --filter @workspace/api-spec run codegen` and commit the diff:\n" +
      diff
        .split("\n")
        .map((f) => `  - ${f}`)
        .join("\n"),
  );
  process.exit(1);
} catch (err) {
  console.error("codegen-check: failed to run codegen:", err);
  process.exit(1);
}
