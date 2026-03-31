/** Stable API error codes returned by the VEYA backend. */
export const VeyaErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION: "VALIDATION",
  SPENDING_LIMIT: "SPENDING_LIMIT",
  ANCHOR_NOT_CONFIGURED: "ANCHOR_NOT_CONFIGURED",
  ANCHOR_FAILED: "ANCHOR_FAILED",
  NOT_VEYA_TX: "NOT_VEYA_TX",
} as const;

export type VeyaErrorCode = (typeof VeyaErrorCodes)[keyof typeof VeyaErrorCodes];
