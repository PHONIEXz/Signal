import { PRIVATE_HEADERS } from "./auth-http.ts";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../auth.ts";
import { getAccountConnectionAccess } from "./account-access";
import { saveConnection, ConnectionIdentityError } from "./save-connection.ts";
import { encrypt, decrypt } from "./encryption.ts";
import { prisma } from "./prisma.ts";
import { refreshedToken } from "./metric-diagnostics.ts";
import { CreatorApiError, creatorConfigured, creatorJson, type CreatorPlatform } from "./creator-platforms.ts";
function origin() { const url = new URL(process.env.APP_URL ?? ""); if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.hostname === "localhost"))
    throw Error("Invalid app origin"); return url.origin; }
export async function creatorStart(platform: CreatorPlatform) {
    const session = await auth();
    if (!session?.user?.id)
        return NextResponse.redirect(new URL("/login", origin()));
    const redirect = (error: string) => NextResponse.redirect(new URL(`/dashboard/accounts?error=${error}`, origin()));
    if (!creatorConfigured(platform))
        return redirect(`${platform}_setup_required`);
    if (!(await getAccountConnectionAccess(session.user.id, platform)).allowed)
        return redirect("free_account_limit");
    const state = crypto.randomBytes(32).toString("hex");
    const callback = `${origin()}/api/connect/${platform}/callback`;
    const url = new URL(platform === "instagram" ? "https://www.facebook.com/v26.0/dialog/oauth" : "https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", platform === "instagram" ? process.env.FACEBOOK_APP_ID! : process.env.YOUTUBE_CLIENT_ID!);
    url.searchParams.set("redirect_uri", callback);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    const verifier = crypto.randomBytes(32).toString("base64url");
    if (platform === "instagram") {
        url.searchParams.set("config_id", process.env.INSTAGRAM_FACEBOOK_CONFIG_ID!);
        url.searchParams.set("override_default_response_type", "true");
    }
    else {
        url.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly");
        url.searchParams.set("access_type", "offline");
        url.searchParams.set("prompt", "consent");
        url.searchParams.set("code_challenge", crypto.createHash("sha256").update(verifier).digest("base64url"));
        url.searchParams.set("code_challenge_method", "S256");
    }
    const response = NextResponse.redirect(url, { headers: PRIVATE_HEADERS });
    const options = { httpOnly: true, secure: origin().startsWith("https:"), sameSite: "lax" as const, maxAge: 600, path: `/api/connect/${platform}/callback` };
    response.cookies.set(`${platform}_state`, `${session.user.id}:${state}`, options);
    if (platform === "youtube")
        response.cookies.set("youtube_verifier", verifier, options);
    return response;
}
export async function creatorCallback(request: NextRequest, platform: CreatorPlatform) {
    const redirect = (value: string) => { const response = NextResponse.redirect(new URL(`/dashboard/accounts?${value}`, origin()), { headers: PRIVATE_HEADERS }); response.cookies.set(`${platform}_state`, "", { maxAge: 0, path: `/api/connect/${platform}/callback` }); if (platform === "youtube")
        response.cookies.set("youtube_verifier", "", { maxAge: 0, path: "/api/connect/youtube/callback" }); return response; };
    const session = await auth();
    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    if (!session?.user?.id || !state || !code || request.cookies.get(`${platform}_state`)?.value !== `${session.user.id}:${state}`)
        return redirect(`error=${platform}_authorization_failed`);
    if (!creatorConfigured(platform))
        return redirect(`error=${platform}_setup_required`);
    if (!(await getAccountConnectionAccess(session.user.id, platform)).allowed)
        return redirect("error=free_account_limit");
    try {
        const body = new URLSearchParams({ client_id: platform === "instagram" ? process.env.FACEBOOK_APP_ID! : process.env.YOUTUBE_CLIENT_ID!, client_secret: platform === "instagram" ? process.env.FACEBOOK_APP_SECRET! : process.env.YOUTUBE_CLIENT_SECRET!, code, redirect_uri: `${origin()}/api/connect/${platform}/callback`, grant_type: "authorization_code" });
        if (platform === "youtube") {
            const verifier = request.cookies.get("youtube_verifier")?.value;
            if (!verifier)
                throw Error("Missing verifier");
            body.set("code_verifier", verifier);
        }
        const response = await fetch(platform === "instagram" ? "https://graph.facebook.com/v26.0/oauth/access_token" : "https://oauth2.googleapis.com/token", { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(20000) });
        const data = await response.json();
        if (!response.ok)
            throw Error("Token rejected");
        if (platform === "youtube" && (typeof data.scope !== "string" || !["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/yt-analytics.readonly"].every(scope => data.scope.split(" ").includes(scope))))
            return redirect("error=youtube_permissions_required");
        let parsed = refreshedToken(platform, data);
        if (platform === "instagram") {
            const exchange = new URL("https://graph.facebook.com/v26.0/oauth/access_token");
            exchange.searchParams.set("grant_type", "fb_exchange_token");
            exchange.searchParams.set("client_id", process.env.FACEBOOK_APP_ID!);
            exchange.searchParams.set("client_secret", process.env.FACEBOOK_APP_SECRET!);
            exchange.searchParams.set("fb_exchange_token", parsed.accessToken);
            const exchanged = await fetch(exchange, { cache: "no-store", signal: AbortSignal.timeout(20000) });
            if (!exchanged.ok)
                throw Error("Token exchange failed");
            parsed = refreshedToken(platform, await exchanged.json());
        }
        let id: string;
        let name: string;
        let token = parsed.accessToken;
        if (platform === "instagram") {
            const pages = await creatorJson("https://graph.facebook.com/v26.0/me/accounts?fields=id,access_token,instagram_business_account{id,username}", token);
            const eligible = (Array.isArray(pages?.data) ? pages.data : []).filter((page: {
                access_token?: string;
                instagram_business_account?: {
                    id?: string;
                };
            }) => typeof page.access_token === "string" && typeof page.instagram_business_account?.id === "string");
            if (!Array.isArray(eligible) || eligible.length !== 1 || pages?.paging?.next)
                return redirect("error=instagram_select_one_professional_account");
            id = eligible[0].instagram_business_account.id;
            name = typeof eligible[0].instagram_business_account.username === "string" ? eligible[0].instagram_business_account.username : "Instagram";
            token = eligible[0].access_token;
        }
        else {
            const channels = await creatorJson("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", token);
            if (!Array.isArray(channels?.items) || channels.items.length !== 1)
                return redirect("error=youtube_select_one_channel");
            id = channels.items[0].id;
            name = "YouTube";
        }
        if (typeof id !== "string" || !id)
            throw Error("Missing identity");
        const existing = await prisma.connectedAccount.findUnique({ where: { userId_platform: { userId: session.user.id, platform } } });
        await saveConnection(session.user.id, platform, { platformUserId: id, displayName: name, accessToken: encrypt(token), refreshToken: platform === "youtube" ? (parsed.refreshToken ? encrypt(parsed.refreshToken) : existing?.platformUserId === id ? existing.refreshToken : null) : null, expiresAt: parsed.expiresAt });
        return redirect(`connected=${platform}`);
    }
    catch (error) {
        return redirect(`error=${error instanceof ConnectionIdentityError ? "account_identity_mismatch" : `${platform}_authorization_failed`}`);
    }
}
export async function youtubeToken(accountId: string) {
    const account = await prisma.connectedAccount.findUniqueOrThrow({ where: { id: accountId } });
    if (account.expiresAt && account.expiresAt.getTime() > Date.now() + 60000)
        return decrypt(account.accessToken);
    if (!account.refreshToken || !creatorConfigured("youtube"))
        throw new CreatorApiError("YouTube authorization requires renewal. Reauthorize the original channel.");
    const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ client_id: process.env.YOUTUBE_CLIENT_ID!, client_secret: process.env.YOUTUBE_CLIENT_SECRET!, refresh_token: decrypt(account.refreshToken), grant_type: "refresh_token" }), cache: "no-store", signal: AbortSignal.timeout(20000) });
    const data = await response.json();
    if (!response.ok)
        throw new CreatorApiError("YouTube authorization could not be renewed. Reauthorize the original channel.");
    const parsed = refreshedToken("youtube", data);
    await prisma.connectedAccount.update({ where: { id: accountId }, data: { accessToken: encrypt(parsed.accessToken), expiresAt: parsed.expiresAt } });
    return parsed.accessToken;
}
