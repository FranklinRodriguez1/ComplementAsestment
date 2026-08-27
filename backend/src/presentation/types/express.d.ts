// Augments Express's Request with the two fields every downstream handler
// relies on: correlationId (set by correlation-id.middleware.ts on every
// request) and userId (set by auth.middleware.ts ONLY after verifying the
// JWT -- never present otherwise, so its mere presence is meaningful).
declare namespace Express {
  interface Request {
    correlationId: string;
    userId?: string;
  }
}
