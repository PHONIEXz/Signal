// Explicitly enabled only by the isolated HTTP test. Never intercept real tokens.
if (process.env.SIGNAL_METRIC_HTTP_FIXTURES === "1") {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    const headers = new Headers(options?.headers ?? (input instanceof Request ? input.headers : undefined));
    const token = headers.get("authorization") ?? "";
    if (!token.startsWith("Bearer signal-metric-fixture-")) return originalFetch(input, options);
    const url = new URL(input instanceof Request ? input.url : String(input));
    const response = (body, status = 200) => Response.json(body, { status });
    if (token.endsWith("credits") && url.pathname === "/2/users/me") return response({ title: "CreditsDepleted" }, 402);
    if (token.endsWith("posts") && url.pathname === "/2/users/me") return response({ data: { id: "123", name: "Fixture X", public_metrics: { following_count: 3, tweet_count: 100 } } });
    if (token.endsWith("posts") && url.pathname === "/2/users/123/tweets") return response({ data: [{ id: "999", text: "Fresh API fixture", created_at: new Date().toISOString(), public_metrics: { like_count: 9, reply_count: 2, retweet_count: 0, quote_count: 0, impression_count: 100 } }], meta: {} });
    if (token.endsWith("scope") && url.pathname === "/v2/user/info/") return response({ error: { code: "scope_not_authorized" } }, 401);
    if (token.endsWith("scope") && url.pathname === "/v2/video/list/") return response({ data: { videos: [{ id: "44", title: "TikTok fixture", create_time: Math.floor(Date.now()/1000), like_count: 3, comment_count: 1, share_count: 0, view_count: 60 }], has_more: false }, error: { code: "ok" } });
    if (token.endsWith("invalid") && url.pathname === "/v26.0/456") return response({ error: { code: 190 } }, 400);
    throw new Error("Unexpected fixture provider request: " + url.pathname);
  };
}
