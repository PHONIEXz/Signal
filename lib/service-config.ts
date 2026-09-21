export type Service = "ai" | "metrics" | "publishing";
export function enabled(service: Service, env = process.env) {
  const value = env[`SIGNAL_${service.toUpperCase()}_ENABLED`];
  return value === undefined || value === "" || value.toLowerCase() === "true";
}
export function limit(name: string, fallback: number, env = process.env) {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000 ? value : 0;
}
export function userLimit(service: Service, plan: string) {
  const defaults = { ai: [5, 30], metrics: [2, 8], publishing: [2, 10] };
  const pro = plan === "PRO";
  return limit(`SIGNAL_${service.toUpperCase()}_${pro ? "PRO" : "FREE"}_DAILY`, defaults[service][pro ? 1 : 0]);
}
export function isAdmin(userId: string | undefined, env = process.env) {
  return !!userId && (env.SIGNAL_ADMIN_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean).includes(userId);
}
export function serviceReadiness(env = process.env) {
  const present = (...keys: string[]) => keys.every(key => !!env[key]?.trim());
  return [
    { name: "AI", configured: present("GEMINI_API_KEY"), enabled: enabled("ai", env) },
    { name: "Facebook", configured: present("FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET", "FACEBOOK_CONFIG_ID"), enabled: enabled("metrics", env) },
    { name: "X", configured: present("X_CLIENT_ID", "X_CLIENT_SECRET"), enabled: enabled("metrics", env) },
    { name: "TikTok", configured: present("TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"), enabled: enabled("metrics", env) },
    { name: "Email", configured: env.EMAIL_PROVIDER === "resend" && present("RESEND_API_KEY", "EMAIL_FROM"), enabled: env.EMAIL_PROVIDER === "resend" },
  ];
}
