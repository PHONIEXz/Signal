import { configuredValue } from "./reset-config.ts";
export function googleAuthConfig(env: { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string } = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
}) {
  const clientId = configuredValue(env.GOOGLE_CLIENT_ID);
  const clientSecret = configuredValue(env.GOOGLE_CLIENT_SECRET);
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}
