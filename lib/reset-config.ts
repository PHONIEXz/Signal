export function configuredValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && !["null", "undefined"].includes(trimmed.toLowerCase()) ? trimmed : null;
}

export function isLoopback(url: URL) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

export function resetOrigin() {
  const value = configuredValue(process.env.APP_URL);
  if (!value) throw new Error("APP_URL is not configured");
  const url = new URL(value);
  const localDevelopment = process.env.NODE_ENV !== "production" && isLoopback(url);
  if (
    url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
    (url.protocol !== "https:" && !(localDevelopment && url.protocol === "http:"))
  ) {
    throw new Error("APP_URL must be a trusted HTTPS origin (HTTP loopback allowed in development)");
  }
  return url.origin;
}

export function emailDeliveryReady() {
  return process.env.EMAIL_PROVIDER === "resend" &&
    !!configuredValue(process.env.RESEND_API_KEY) &&
    !!configuredValue(process.env.EMAIL_FROM);
}
