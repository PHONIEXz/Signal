import assert from "node:assert/strict";
import test from "node:test";
import {
  facebookApiErrorCode,
  facebookPostsWarning,
  normalizeFacebookPost,
  profileImageUrl,
} from "./platform-data.ts";

test("extracts secure profile images from each supported platform", () => {
  assert.equal(
    profileImageUrl("facebook", { data: { url: "https://fbcdn.example/avatar.jpg" } }),
    "https://fbcdn.example/avatar.jpg"
  );
  assert.equal(
    profileImageUrl("x", { data: { profile_image_url: "https://pbs.example/avatar.jpg" } }),
    "https://pbs.example/avatar.jpg"
  );
  assert.equal(
    profileImageUrl("tiktok", { data: { user: { avatar_url: "https://tt.example/avatar.jpg" } } }),
    "https://tt.example/avatar.jpg"
  );
  assert.equal(profileImageUrl("x", { data: { profile_image_url: "http://unsafe.test/a" } }), null);
});

test("normalizes Facebook posts and preserves their real permalink", () => {
  const post = normalizeFacebookPost({
    id: "page_post",
    message: "Launch update",
    permalink_url: "https://www.facebook.com/example/posts/1",
    created_time: "2026-09-15T10:00:00+0000",
    reactions: { summary: { total_count: 12 } },
    comments: { summary: { total_count: 3 } },
    shares: { count: 2 },
  });

  assert.equal(post.url, "https://www.facebook.com/example/posts/1");
  assert.equal(post.engagementCount, 17);
  assert.equal(post.postedAt?.toISOString(), "2026-09-15T10:00:00.000Z");
});

test("turns Facebook permission failures into actionable warnings", () => {
  const code = facebookApiErrorCode({ error: { code: 200 } });
  assert.equal(code, 200);
  assert.match(facebookPostsWarning(code), /pages_read_engagement/);
});
