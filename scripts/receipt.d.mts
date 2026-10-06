export function receiptState(receipt: unknown): {
  accepted: boolean;
  finalized: boolean;
  execution: "SUCCESS" | "ERROR" | "UNKNOWN";
};
export function assertFinalizedSuccess(receipt: unknown): ReturnType<typeof receiptState>;
