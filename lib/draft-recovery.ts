import { MAX_IMAGE_DATA_LENGTH } from "./draft-image.ts";
export type RecoveryDraft = { text: string; mediaUrl: string; scheduledFor: string; targetIds: string[]; savedAt: number };
export function readRecovery(raw: string | null, now = Date.now()): RecoveryDraft | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || typeof value.text !== "string" || value.text.length > 65000 || typeof value.mediaUrl !== "string" || value.mediaUrl.length > MAX_IMAGE_DATA_LENGTH || typeof value.scheduledFor !== "string" || !Array.isArray(value.targetIds) || value.targetIds.length > 20 || !value.targetIds.every((id:unknown)=>typeof id==="string") || typeof value.savedAt !== "number" || value.savedAt > now || now-value.savedAt > 86400000) return null;
    return value;
  } catch { return null; }
}
