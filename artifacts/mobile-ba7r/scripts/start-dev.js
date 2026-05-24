#!/usr/bin/env node
/**
 * Dev startup wrapper: kills any process holding the Metro port,
 * then starts expo start.
 */
const fs = require("fs");
const { spawn } = require("child_process");

const port = parseInt(process.env.PORT || "8081", 10);

function killPortProcess(targetPort) {
  try {
    const hexPort = targetPort.toString(16).padStart(4, "0").toUpperCase();

    const tcp = fs.readFileSync("/proc/net/tcp", "utf8");
    const lines = tcp.split("\n").slice(1);
    const inodes = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts[1] && parts[1].split(":")[1] === hexPort) {
        inodes.add(parts[9]);
      }
    }

    if (inodes.size === 0) {
      return;
    }

    const procDirs = fs.readdirSync("/proc").filter((d) => /^\d+$/.test(d));
    for (const pid of procDirs) {
      const myPid = process.pid.toString();
      if (pid === myPid) continue;
      try {
        const fdDir = `/proc/${pid}/fd`;
        const fds = fs.readdirSync(fdDir);
        for (const fd of fds) {
          try {
            const link = fs.readlinkSync(`${fdDir}/${fd}`);
            const match = link.match(/socket:\[(\d+)\]/);
            if (match && inodes.has(match[1])) {
              console.log(`Killing orphan process ${pid} on port ${targetPort}`);
              process.kill(parseInt(pid, 10), "SIGKILL");
              break;
            }
          } catch {
          }
        }
      } catch {
      }
    }
  } catch (e) {
    // /proc not available or other error — ignore
  }
}

function main() {
  killPortProcess(port);

  const child = spawn(
    "pnpm",
    [
      "exec",
      "expo",
      "start",
      "--localhost",
      "--port",
      String(port),
      "--non-interactive",
    ],
    {
      stdio: "inherit",
      env: process.env,
    },
  );

  const onExit = (signal) => {
    child.kill(signal);
  };
  process.on("SIGTERM", () => onExit("SIGTERM"));
  process.on("SIGINT", () => onExit("SIGINT"));

  child.on("exit", (code) => process.exit(code ?? 0));
}

main();
