import { test } from "node:test";
import assert from "node:assert/strict";
import { diagnosticCode } from "./transfer-diagnostics.ts";

test("diagnostics expose only known codes, including nested network failures", () => {
  assert.equal(diagnosticCode({ message: "secret SQL and token", code: "FETCH_ERROR", cause: { code: "UND_ERR_CONNECT_TIMEOUT" } }), "FETCH_ERROR / UND_ERR_CONNECT_TIMEOUT");
  assert.equal(diagnosticCode({ code: "private-token", message: "private-record" }), "UNCLASSIFIED");
  const cyclic: { cause?: unknown } = {}; cyclic.cause = cyclic;
  assert.equal(diagnosticCode(cyclic), "UNCLASSIFIED");
});
