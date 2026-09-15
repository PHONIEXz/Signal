import { isLoopback, resetOrigin } from "./reset-config.ts";

export const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};

export class AuthInputError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function readAuthBody(request: Request, maxBytes = 4096): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new AuthInputError("Send a JSON request.", 415);
  }
  const origin = request.headers.get("origin");
  let trusted = origin === resetOrigin();
  if (!trusted && origin && process.env.NODE_ENV !== "production") {
    try {
      const local = new URL(origin);
      trusted = isLoopback(local) && ["http:", "https:"].includes(local.protocol);
    } catch { /* Reject invalid origins. */ }
  }
  if (!trusted) throw new AuthInputError("Please submit this form from Signal.", 403);
  // Bound the actual stream, not the caller-controlled Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new AuthInputError("The request is empty.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AuthInputError("The request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new AuthInputError("Please check the form and try again."); }
}
