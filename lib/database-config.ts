type Environment = Record<string, string | undefined>;

function value(input: string | undefined) {
  const result = input?.trim();
  return result && !["null", "undefined"].includes(result.toLowerCase()) ? result : undefined;
}

export function tursoConfig(env: Environment = process.env) {
  const url = value(env.TURSO_DATABASE_URL);
  const authToken = value(env.TURSO_AUTH_TOKEN);
  if (!url || !authToken) throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN on the server.");
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("TURSO_DATABASE_URL is invalid."); }
  if (!["libsql:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password ||
      parsed.search || parsed.hash || parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error("Use the secure Turso database URL without a path, query, or embedded credentials.");
  }
  return { url, authToken };
}

export function databaseConfig(env: Environment = process.env) {
  const provider = value(env.DATABASE_PROVIDER) ?? (env.VERCEL === "1" ? "turso" : "sqlite");
  if (provider === "turso") return { provider, ...tursoConfig(env) } as const;
  if (provider !== "sqlite") throw new Error("DATABASE_PROVIDER must be sqlite or turso.");
  if (env.VERCEL === "1") throw new Error("Vercel requires DATABASE_PROVIDER=turso; local SQLite is not persistent there.");
  const url = value(env.DATABASE_URL) ?? "file:./dev.db";
  if (!url.startsWith("file:")) throw new Error("Local DATABASE_URL must start with file:. Use DATABASE_PROVIDER=turso for Turso.");
  return { provider, url } as const;
}
