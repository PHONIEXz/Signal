// Only fixed diagnostic codes are exposed; driver messages can contain SQL/data.
const codes = new Set([
  "SQLITE_BUSY", "SQLITE_LOCKED", "SQLITE_READONLY", "SQLITE_ERROR", "SQLITE_CORRUPT",
  "SQLITE_CONSTRAINT", "SQLITE_CONSTRAINT_FOREIGNKEY", "SQLITE_CONSTRAINT_UNIQUE",
  "SQLITE_CONSTRAINT_NOTNULL", "SQLITE_FULL", "SQLITE_TOOBIG", "SQLITE_CANTOPEN",
  "SQLITE_IOERR", "URL_INVALID", "AUTH_FAILED", "UNAUTHORIZED", "FORBIDDEN",
  "SERVER_ERROR", "HRANA_WEBSOCKET_ERROR", "HRANA_PROTO_ERROR", "STREAM_EXPIRED",
  "TRANSACTION_TIMEOUT", "TRANSACTION_CLOSED", "HTTP_SERVER_ERROR", "FETCH_ERROR",
  "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "ETIMEDOUT", "ECONNRESET",
  "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ENOENT", "EACCES", "ERR_OUT_OF_RANGE",
]);
export function diagnosticCode(error: unknown): string {
  const found = new Set<string>();
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    const e = current as { code?: unknown; cause?: unknown };
    if (typeof e.code === "string" && codes.has(e.code)) found.add(e.code);
    current = e.cause;
  }
  return [...found].join(" / ") || "UNCLASSIFIED";
}
