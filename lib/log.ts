/**
 * One JSON object per line on stdout; Cloud Logging parses `severity` and `message`.
 * Never pass API keys, the user's question text or full IP addresses in `fields`.
 */
type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SEVERITY: Record<Level, string> = {
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
};

function threshold(): number {
  const lvl = (process.env.LOG_LEVEL ?? "info") as Level;
  return ORDER[lvl] ?? ORDER.info;
}

function write(level: Level, message: string, fields: Record<string, unknown> = {}) {
  if (ORDER[level] < threshold()) return;
  const entry = {
    severity: SEVERITY[level],
    message,
    revision: process.env.K_REVISION,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const log = {
  debug: (m: string, f?: Record<string, unknown>) => write("debug", m, f),
  info: (m: string, f?: Record<string, unknown>) => write("info", m, f),
  warn: (m: string, f?: Record<string, unknown>) => write("warn", m, f),
  error: (m: string, f?: Record<string, unknown>) => write("error", m, f),
};
