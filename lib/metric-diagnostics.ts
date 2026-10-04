export type MetricDiagnostic = {
  code: string;
  responsibility: "connection" | "platform" | "signal" | "unknown";
  message: string;
  stopAccountRequests: boolean;
};
export class MetricTokenError extends Error {
  diagnostic: MetricDiagnostic;
  constructor(diagnostic: MetricDiagnostic) { super(diagnostic.message); this.diagnostic=diagnostic; }
}
export function tokenRefreshFailure(platform:string,status:number,payload:unknown) {
  const error=payload && typeof payload === "object" ? (payload as {error?:unknown}).error : undefined;
  if(error === "invalid_grant") return {code:"METRIC_RECONNECT",responsibility:"connection" as const,message:"The saved authorization can no longer be renewed. Reconnect this account in Accounts.",stopAccountRequests:true};
  if(error === "invalid_client") return {code:"METRIC_CONFIGURATION",responsibility:"signal" as const,message:"The platform rejected Signal's application credentials. The site owner needs to check the server configuration.",stopAccountRequests:true};
  return platformMetricFailure(platform,status,payload);
}

export function refreshedToken(platform: string, payload: unknown, now=Date.now()) {
  const data=payload && typeof payload === "object" ? payload as Record<string,unknown> : {};
  if (typeof data.access_token !== "string" || !data.access_token.trim() ||
      typeof data.expires_in !== "number" || !Number.isSafeInteger(data.expires_in) || data.expires_in<=0 ||
      !Number.isFinite(new Date(now+data.expires_in*1000).getTime()) ||
      (data.refresh_token !== undefined && (typeof data.refresh_token !== "string" || !data.refresh_token.trim())))
    throw new MetricTokenError({code:"METRIC_TOKEN_RESPONSE",responsibility:"unknown",message:`${platform === "x" ? "X" : "TikTok"} returned an unusable token refresh response. Signal kept the previous connection; this response needs review.`,stopAccountRequests:true});
  return {accessToken:data.access_token,refreshToken:data.refresh_token as string|undefined,expiresAt:new Date(now+data.expires_in*1000)};
}

// Classify allowlisted status/error codes, never relay upstream messages/tokens.
export function platformMetricFailure(platform: string, status: number, payload: unknown): MetricDiagnostic | null {
  const data = payload && typeof payload === "object" ? payload as { error?: { code?: unknown } } : null;
  const providerCode = data?.error?.code;
  const label = platform === "x" ? "X" : platform === "facebook" ? "Facebook" : "TikTok";
  const issue = (code: string, responsibility: MetricDiagnostic["responsibility"], message: string, stopAccountRequests=true) => ({code,responsibility,message,stopAccountRequests});
  if (platform === "tiktok" && ["scope_not_authorized", "scope_permission_missed"].includes(String(providerCode)))
    return issue("METRIC_PERMISSION", "connection", "TikTok has not granted access to these fields. Account counters need user.info.stats; video measurements need video.list. Check app approval and reconnect with the required permissions.", false);
  if (status === 401 || (platform === "facebook" && providerCode === 190) || (platform === "tiktok" && providerCode === "access_token_invalid"))
    return issue("METRIC_RECONNECT", "connection", `${label} rejected the saved access token. Reconnect this account in Accounts.`);
  if (status === 402 && platform === "x")
    return issue("METRIC_CREDITS", "platform", "X rejected the request because API credit or billing access is unavailable. Check the X Developer Console balance and spending cap. Reconnecting will not restore API credits.");
  if (status === 429 || (platform === "facebook" && [4,17,32,613].includes(Number(providerCode))) || providerCode === "rate_limit_exceeded")
    return issue("METRIC_RATE_LIMIT", "platform", `${label} limited API requests. Keep your saved data and try again after the platform limit resets.`);
  if (status >= 500 || providerCode === "internal_error" || (platform === "facebook" && [1,2].includes(Number(providerCode))))
    return issue("METRIC_PROVIDER_ERROR", "platform", `${label} could not complete the API request. Try again later; reconnecting is not the first remedy.`);
  if (platform === "facebook" && [10,200].includes(Number(providerCode)))
    return issue("METRIC_PERMISSION", "connection", "Facebook denied access to the requested fields. Check Page access and app approval for pages_read_engagement and read_insights.", false);
  // Meta code 100 includes invalid fields AND object-access problems. Do not
  // confidently blame a permission or the user without inspecting the request.
  if ((platform === "facebook" && providerCode === 100) || providerCode === "invalid_params" || status === 400)
    return issue("METRIC_REQUEST_REVIEW", "unknown", `${label} rejected the requested fields or account identifier. Signal's API request and the account's access need review. Reconnecting may not fix this.`, false);
  if (status === 403)
    return issue("METRIC_PERMISSION", "connection", `${label} denied this API request. Check the application's approved permissions and the connected account's access.`, false);
  if (status >= 400 || (platform === "facebook" && typeof providerCode === "number") || (platform === "tiktok" && typeof providerCode === "string" && providerCode !== "ok"))
    return issue("METRIC_UNKNOWN_PROVIDER", "unknown", `${label} rejected collection. Signal needs to inspect the response category before recommending a fix.`);
  return null;
}

export function metricRefreshError(body: unknown): string {
  const data=body && typeof body === "object" ? body as {error?: unknown} : null;
  return typeof data?.error === "string" && data.error.length <= 1000 ? data.error : "We couldn't refresh this account. Your saved data is still available.";
}
