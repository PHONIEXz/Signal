const currentOrigin = "https://signal-phoenix-dashboard.vercel.app";
const brandedOrigin = "https://socialpanora.phoenixreborn.tech";

/** Keep authentication on one owned host until the provider callbacks migrate. */
export function canonicalAppRedirects(appUrl?: string) {
  if (!appUrl?.trim()) return [];
  let canonical: URL;
  try { canonical = new URL(appUrl.trim()); } catch { return []; }
  if (canonical.username || canonical.password || canonical.pathname !== "/" || canonical.search || canonical.hash) return [];
  // Restrict redirects to these verified app origins. Local/test/preview origins
  // do not acquire a production redirect or trust caller-supplied destinations.
  if (![currentOrigin, brandedOrigin].includes(canonical.origin)) return [];
  const alternate = new URL(canonical.origin === currentOrigin ? brandedOrigin : currentOrigin);
  const sources = canonical.origin === brandedOrigin ? ["/:path*"] : [
    "/login", "/signup", "/forgot-password", "/reset-password",
    "/dashboard/:path*", "/api/auth/:path*", "/api/connect/:path*", "/api/signup",
  ];
  return sources.map(source => ({
    source,
    has: [{ type: "host" as const, value: alternate.hostname.replaceAll(".", "\\.") }],
    destination: canonical.origin + source,
    // Temporary during migration. Do not cache the old sign-in host forever.
    permanent: false,
  }));
}
