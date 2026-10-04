import { NextResponse } from "next/server";
import { auth } from "../auth.ts";
import { prisma } from "./prisma.ts";
import { decrypt } from "./encryption.ts";
import { resetOrigin } from "./reset-config.ts";
import { requestOrigin, PRIVATE_HEADERS } from "./auth-http.ts";
import type { CreatorPlatform } from "./creator-platforms.ts";
export async function disconnectCreator(request: Request, platform: CreatorPlatform) {
    const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
    const session = await auth();
    if (!session?.user?.id)
        return json({ error: "Not authenticated" }, 401);
    if (![requestOrigin(request), resetOrigin()].includes(request.headers.get("origin") ?? ""))
        return json({ error: "Unlink this account from Signal." }, 403);
    try {
        const account = await prisma.connectedAccount.findUnique({ where: { userId_platform: { userId: session.user.id, platform } } });
        if (!account)
            return json({ error: "This platform is not connected." }, 404);
        if (platform === "youtube") {
            const response = await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", body: new URLSearchParams({ token: decrypt(account.refreshToken ?? account.accessToken) }), cache: "no-store", signal: AbortSignal.timeout(15000) });
            if (!response.ok) {
                const body = await response.json().catch(() => null);
                if (!(response.status === 400 && body?.error === "invalid_token"))
                    return json({ error: "Google could not confirm revocation. Try again; your connection was kept." }, 502);
            }
        }
        await prisma.connectedAccount.delete({ where: { id: account.id } });
        return json({ success: true, message: "Connection and its stored Signal data removed. Content on the platform is unchanged." });
    }
    catch {
        return json({ error: "Signal could not finish unlinking. Try again." }, 500);
    }
}
