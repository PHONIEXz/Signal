import { prisma } from "./prisma.ts";
import { getValidXAccessToken } from "./x-token.ts";
import { decrypt } from "./encryption.ts";
import { sendPost, PublishError, RETRYABLE_DELIVERIES } from "./content-publishing.ts";
export async function publishDraft(userId: string, contentDraftId: string, connectedAccountId: string, request: typeof fetch = fetch) {
  const claimed = await prisma.$transaction(async (tx) => {
    const draft = await tx.contentDraft.findFirst({ where: { id: contentDraftId, userId }, include: { targets: { where: { connectedAccountId }, include: { connectedAccount: true } } } });
    const account = draft?.targets[0]?.connectedAccount;
    if (!draft || !account || account.userId !== userId) throw new PublishError("NOT_FOUND", "Draft or account not found.");
    if (!["x", "facebook"].includes(account.platform)) throw new PublishError("ASSISTED_ONLY", "Copy and open TikTok to upload your video.");
    const row = await tx.contentPublication.upsert({ where: { contentDraftId_connectedAccountId: { contentDraftId, connectedAccountId } }, update: {}, create: { contentDraftId, connectedAccountId } });
    if (row.status === "PUBLISHED") return { kind: "receipt" as const, receipt: row };
    if (!RETRYABLE_DELIVERIES.includes(row.status)) throw new PublishError("CHECK_PLATFORM", "This delivery is already in progress or unconfirmed. Check the platform before using a new copy.");
    let token: string;
    try { token = decrypt(account.accessToken); }
    catch { throw new PublishError("PERMISSION_REQUIRED", "Your connection token could not be opened. Check the encryption key or reconnect this account."); }
    if (account.platform !== "x" && account.expiresAt && account.expiresAt <= new Date()) throw new PublishError("PERMISSION_REQUIRED", "Your connection expired. Reconnect before publishing.");
    const winner = await tx.contentPublication.updateMany({ where: { id: row.id, status: { in: RETRYABLE_DELIVERIES } }, data: { status: "PUBLISHING", attemptedAt: new Date(), errorCode: null, errorMessage: null } });
    if (!winner.count) throw new PublishError("CHECK_PLATFORM", "This draft is already being delivered.");
    return { kind: "send" as const, rowId: row.id, input: { platform: account.platform, platformUserId: account.platformUserId, token, text: draft.text, mediaUrl: draft.mediaUrl } };
  });
  if (claimed.kind === "receipt") return claimed.receipt;
  if (claimed.input.platform === "x") {
    try { claimed.input.token = await getValidXAccessToken(connectedAccountId, request); }
    catch {
      const message = "Your X connection could not be refreshed. Reconnect this account before publishing.";
      await prisma.contentPublication.update({ where: { id: claimed.rowId }, data: { status: "PERMISSION_REQUIRED", errorCode: "PERMISSION_REQUIRED", errorMessage: message } });
      throw new PublishError("PERMISSION_REQUIRED", message);
    }
  }
  let remote;
  try { remote = await sendPost(claimed.input, request); }
  catch (error) {
    const safe = error instanceof PublishError ? error : new PublishError("UNKNOWN", "Delivery could not be confirmed. Check the platform before reposting.");
    await prisma.contentPublication.update({ where: { id: claimed.rowId }, data: { status: safe.code, errorCode: safe.code, errorMessage: safe.message } });
    throw safe;
  }
  // Keep receipt persistence separate: storage failure after provider acceptance must stay locked.
  try {
    return await prisma.$transaction(async (tx) => {
      const receipt = await tx.contentPublication.update({ where: { id: claimed.rowId }, data: { ...remote, status: "PUBLISHED", publishedAt: new Date(), errorCode: null, errorMessage: null } });
      const targets = await tx.contentDraftTarget.count({ where: { contentDraftId } });
      const delivered = await tx.contentPublication.count({ where: { contentDraftId, status: "PUBLISHED" } });
      await tx.contentDraft.update({ where: { id: contentDraftId }, data: { status: delivered === targets ? "PUBLISHED" : "PARTIAL" } });
      return receipt;
    });
  } catch { throw new PublishError("CHECK_PLATFORM", "The platform accepted your post, but its receipt could not be saved. Check the platform before posting a copy."); }
}
