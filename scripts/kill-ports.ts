import { execSync } from "node:child_process";

const ports = [3001, 3010, 3011];

for (const port of ports) {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
      });

      const pids = new Set(
        output
          .split("\n")
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid)),
      );

      for (const pid of pids) {
        console.log(`Killing port ${port} pid ${pid}`);
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      }
    } else {
      const output = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" });
      const pids = output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      for (const pid of pids) {
        console.log(`Killing port ${port} pid ${pid}`);
        execSync(`kill -9 ${pid}`, { stdio: "ignore" });
      }
    }
  } catch {
    // No process on this port.
  }
}
