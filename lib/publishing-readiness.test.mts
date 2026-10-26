import { test } from "node:test";
import assert from "node:assert/strict";
import { publishingReadiness, publishingMessage } from "./publishing-readiness.ts";

test("publishing readiness uses only the three user-facing account states", () => {
  assert.equal(publishingReadiness("x", null), "Ready to publish");
  assert.equal(publishingReadiness("facebook", null, "PERMISSION_REQUIRED"), "Reconnect needed");
  assert.equal(publishingReadiness("facebook", null, null, true), "Reconnect needed");
  for (const status of ["BILLING_REQUIRED", "RATE_LIMITED", "FAILED"]) assert.equal(publishingReadiness("x", null, status), "Manual posting only");
  assert.equal(publishingReadiness("tiktok", null), "Manual posting only");
});
test("user publishing errors do not expose app credit or developer permission details", () => {
  assert.doesNotMatch(publishingMessage("BILLING_REQUIRED", "API credits needed"), /credits|billing/i);
  assert.doesNotMatch(publishingMessage("PERMISSION_REQUIRED", "tweet.write pages_manage_posts"), /tweet.write|pages_manage_posts/);
  assert.equal(publishingMessage("UNKNOWN", "Check platform before retrying"), "Check platform before retrying");
});
