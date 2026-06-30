/**
 * Optional structured logging hook.
 *
 * The SDK never prints secrets (private keys, Kyber shared secrets, ML-DSA
 * secret keys). Integrators inject a sink if they want operator traces;
 * the default sink is silent so library use does not spam stdout.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEvent = {
  level: LogLevel;
  module: string;
  message: string;
  fields?: Record<string, unknown>;
  ts: number;
};

export type LogSink = (event: LogEvent) => void;

let sink: LogSink = () => {};

export function setLogSink(next: LogSink): void {
  sink = next;
}

export function resetLogSink(): void {
  sink = () => {};
}

const REDACT_KEYS = new Set([
  "privateKey",
  "payerPrivateKey",
  "secretKey",
  "sharedSecret",
  "sharedSecretHex",
  "sessionEntropy",
  "session_entropy_hex",
]);

function redact(fields?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!fields) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = REDACT_KEYS.has(k) ? "[redacted]" : v;
  }
  return out;
}

export function log(
  level: LogLevel,
  module: string,
  message: string,
  fields?: Record<string, unknown>,
): void {
  sink({ level, module, message, fields: redact(fields), ts: Date.now() });
}

export function debug(module: string, message: string, fields?: Record<string, unknown>): void {
  log("debug", module, message, fields);
}

export function info(module: string, message: string, fields?: Record<string, unknown>): void {
  log("info", module, message, fields);
}

export function warn(module: string, message: string, fields?: Record<string, unknown>): void {
  log("warn", module, message, fields);
}

export function error(module: string, message: string, fields?: Record<string, unknown>): void {
  log("error", module, message, fields);
}

/** Stderr JSON sink for operator scripts (doctor, live-rpc). */
export function stderrJsonSink(event: LogEvent): void {
  process.stderr.write(`${JSON.stringify(event)}\n`);
}

export function createBufferSink(): { events: LogEvent[]; sink: LogSink } {
  const events: LogEvent[] = [];
  return {
    events,
    sink: (event) => {
      events.push(event);
    },
  };
}

export function hasRedactedFields(event: LogEvent): boolean {
  if (!event.fields) return false;
  return Object.values(event.fields).some((v) => v === "[redacted]");
}
