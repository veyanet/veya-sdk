export class VeyaError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body?: unknown;

  constructor(message: string, status: number, code?: string, body?: unknown) {
    super(message);
    this.name = "VeyaError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export function isVeyaError(err: unknown): err is VeyaError {
  return err instanceof VeyaError;
}
