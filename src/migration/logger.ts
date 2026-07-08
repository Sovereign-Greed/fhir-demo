import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export interface MigrationLogger {
  info(event: string, data?: Record<string, unknown>): void;
  warn(event: string, data?: Record<string, unknown>): void;
  error(event: string, data?: Record<string, unknown>): void;
}

export function createMigrationLogger(runId: number): MigrationLogger {
  const logDir = path.resolve("logs");
  mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, `migration-${runId}.log`);

  function write(
    level: "info" | "warn" | "error",
    event: string,
    data: Record<string, unknown> = {},
  ): void {
    const entry = {
      time: new Date().toISOString(),
      level,
      event,
      ...data,
    };

    const summary = Object.keys(data).length
      ? `${event} ${JSON.stringify(data)}`
      : event;

    console.log(`[${level}] ${summary}`);
    appendFileSync(logFile, `${JSON.stringify(entry)}\n`);
  }

  return {
    info: (event, data) => write("info", event, data),
    warn: (event, data) => write("warn", event, data),
    error: (event, data) => write("error", event, data),
  };
}
