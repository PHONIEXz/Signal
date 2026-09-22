import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { normalizeDraftMedia } from "./normalize-draft-image.ts";
import { imagePayload, MAX_IMAGE_DATA_LENGTH } from "./draft-image.ts";
import { validMediaUrl } from "./content-drafts.ts";
import { sendPost, deliveryText, PublishError } from "./content-publishing.ts";
import { readRecovery } from "./draft-recovery.ts";
const image = `data:image/png;base64,${(await sharp({ create: { width: 20, height: 20, channels: 3, background: "red" } }).png().toBuffer()).toString("base64")}`;
const input = { platform: "x", platformUserId: "123", token: "test", text: "Photo caption", mediaUrl: image };
test("images decode and normalize to bounded JPEG; malformed, SVG and oversized inputs fail", async () => {
  const normalized = await normalizeDraftMedia(image);
  assert.match(normalized, /^data:image\/jpeg;base64,/);
  assert.ok(imagePayload(normalized));
  assert.equal(validMediaUrl("data:image/svg+xml;base64,PHN2Zz4="), false);
  assert.equal(imagePayload("data:image/png;base64," + "A".repeat(MAX_IMAGE_DATA_LENGTH)), null);
  await assert.rejects(normalizeDraftMedia("data:image/png;base64,YWJjZA=="));
  assert.equal(await normalizeDraftMedia("https://example.com"), "https://example.com");
});
test("saved images survive recovery and never enter post text or intent URLs", () => {
  assert.equal(deliveryText("caption", image), "caption");
  assert.equal(readRecovery(JSON.stringify({ text: "caption", mediaUrl: image, scheduledFor: "", targetIds: [], savedAt: Date.now() }))?.mediaUrl, image);
});
test("X image upload precedes publication and the post references only its media ID", async () => {
  const calls: string[] = [];
  const result = await sendPost(input, async (url, options) => {
    calls.push(String(url));
    const body = JSON.parse(options!.body as string);
    if (calls.length === 1) {
      assert.equal(url, "https://api.x.com/2/media/upload");
      assert.equal(body.media_category, "tweet_image");
      assert.equal(body.media, imagePayload(image)!.base64);
      return Response.json({ data: { id: "789" } });
    }
    assert.equal(url, "https://api.x.com/2/tweets");
    assert.deepEqual(body, { text: "Photo caption", media: { media_ids: ["789"] } });
    return Response.json({ data: { id: "900" } });
  });
  assert.equal(calls.length, 2); assert.equal(result.platformPostId, "900");
});
test("upload errors never send text-only posts; final delivery ambiguity stays locked", async () => {
  for (const [status, code] of [[403,"PERMISSION_REQUIRED"],[429,"RATE_LIMITED"],[402,"BILLING_REQUIRED"],[500,"FAILED"]] as const) {
    let calls = 0;
    await assert.rejects(sendPost(input, async () => { calls++; return new Response("private", {status}); }), (e: unknown) => e instanceof PublishError && e.code === code);
    assert.equal(calls, 1);
  }
  let calls = 0;
  await assert.rejects(sendPost(input, async () => { if (++calls === 1) return Response.json({data:{id:"789"}}); throw new Error("timeout"); }), (e: unknown) => e instanceof PublishError && e.code === "UNKNOWN");
  await assert.rejects(sendPost({...input,platform:"facebook"}, async () => { assert.fail("must not send"); }), (e: unknown) => e instanceof PublishError && e.code === "ASSISTED_ONLY");
  await assert.rejects(sendPost(input, async () => Response.json({data:{id:"789",processing_info:{state:"pending"}}})), (e: unknown) => e instanceof PublishError && e.code === "FAILED");
});
