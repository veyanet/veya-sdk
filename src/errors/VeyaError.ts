export class VeyaError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'VeyaError';
  }
  serialize() {
    return { message: this.message, status: this.status, code: this.code };
  }
}
