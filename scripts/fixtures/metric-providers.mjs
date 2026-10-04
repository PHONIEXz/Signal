// Explicitly enabled only by the isolated HTTP test. Never intercept real tokens.
if (process.env.SIGNAL_METRIC_HTTP_FIXTURES === "1") {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    const headers = new Headers(options?.headers ?? (input instanceof Request ? input.headers : undefined));
    const token = headers.get("authorization") ?? "";
    const fixtureUrl = new URL(input instanceof Request ? input.url : String(input));
    const form=options?.body instanceof URLSearchParams?options.body:null;
    if(fixtureUrl.hostname==="graph.facebook.com" && form?.get("code")==="signal-oauth-instagram")return Response.json({access_token:"signal-metric-fixture-instagram-user",expires_in:3600});
    if(fixtureUrl.hostname==="graph.facebook.com" && fixtureUrl.searchParams.get("fb_exchange_token")==="signal-metric-fixture-instagram-user")return Response.json({access_token:"signal-metric-fixture-instagram-user",expires_in:5184000});
    if(fixtureUrl.hostname==="oauth2.googleapis.com" && form?.get("code")==="signal-oauth-fixture-partial")return Response.json({access_token:"signal-metric-fixture-youtube",expires_in:3600,scope:"https://www.googleapis.com/auth/youtube.readonly"});
    if(fixtureUrl.hostname==="oauth2.googleapis.com" && form?.get("code")==="signal-oauth-fixture")return Response.json({access_token:"signal-metric-fixture-youtube",refresh_token:"signal-metric-fixture-youtube-refresh",expires_in:3600,scope:"https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly"});
    if(fixtureUrl.hostname==="oauth2.googleapis.com" && fixtureUrl.pathname==="/revoke" && form?.get("token")==="signal-metric-fixture-youtube-refresh")return Response.json({});
    if (!token.startsWith("Bearer signal-metric-fixture-")) return originalFetch(input, options);
    const url = new URL(input instanceof Request ? input.url : String(input));
    const response = (body, status = 200) => Response.json(body, { status });
    if (token.endsWith("credits") && url.pathname === "/2/users/me") return response({ title: "CreditsDepleted" }, 402);
    if (token.endsWith("posts") && url.pathname === "/2/users/me") return response({ data: { id: "123", name: "Fixture X", public_metrics: { following_count: 3, tweet_count: 100 } } });
    if (token.endsWith("posts") && url.pathname === "/2/users/123/tweets") return response({ data: [{ id: "999", text: "Fresh API fixture", created_at: new Date().toISOString(), public_metrics: { like_count: 9, reply_count: 2, retweet_count: 0, quote_count: 0, impression_count: 100 } }], meta: {} });
    if (token.endsWith("scope") && url.pathname === "/v2/user/info/") return response({ error: { code: "scope_not_authorized" } }, 401);
    if (token.endsWith("scope") && url.pathname === "/v2/video/list/") return response({ data: { videos: [{ id: "44", title: "TikTok fixture", create_time: Math.floor(Date.now()/1000), like_count: 3, comment_count: 1, share_count: 0, view_count: 60 }], has_more: false }, error: { code: "ok" } });
    if (token.endsWith("invalid") && url.pathname === "/v26.0/456") return response({ error: { code: 190 } }, 400);
    if(token.endsWith("instagram-user") && url.pathname==="/v26.0/me/accounts")return response({data:[{id:"page-fixture",access_token:"signal-metric-fixture-instagram",instagram_business_account:{id:"ig-fixture",username:"Fixture Instagram"}}]});
    if(token.endsWith("instagram") && url.pathname==="/v26.0/ig-fixture")return response({id:"ig-fixture",username:"Fixture Instagram",followers_count:10,follows_count:4,media_count:1});
    if(token.endsWith("instagram") && url.pathname==="/v26.0/ig-fixture/media")return response({data:[{id:"ig-post",caption:"Instagram fixture",timestamp:new Date().toISOString(),like_count:0,comments_count:2,permalink:"https://www.instagram.com/p/fixture/"}]});
    if(token.endsWith("youtube") && url.pathname==="/youtube/v3/channels")return response({items:[{id:"yt-fixture",snippet:{title:"Fixture YouTube"},statistics:{hiddenSubscriberCount:true,videoCount:"1"},contentDetails:{relatedPlaylists:{uploads:"yt-uploads"}}}]});
    if(token.endsWith("youtube") && url.pathname==="/youtube/v3/playlistItems")return response({items:[{contentDetails:{videoId:"yt-video"}}]});
    if(token.endsWith("youtube") && url.pathname==="/youtube/v3/videos")return response({items:[{id:"yt-video",snippet:{title:"YouTube fixture",channelId:"yt-fixture",publishedAt:new Date().toISOString()},status:{privacyStatus:"public"},statistics:{viewCount:"5000000000",likeCount:"0",commentCount:"2"}}]});
    if(token.endsWith("youtube") && url.hostname==="youtubeanalytics.googleapis.com") {const dimensions=url.searchParams.get("dimensions")?.split(",")??[];const metrics=url.searchParams.get("metrics").split(",");return response({columnHeaders:[...dimensions,...metrics].map(name=>({name})),rows:dimensions.length?[]:[[100,90,50.5,45.25,40.5,3,2,1,4,0]]});}
    throw new Error("Unexpected fixture provider request: " + url.pathname);
  };
}
