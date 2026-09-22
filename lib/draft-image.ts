// Shared, browser-safe bounds. Encoded images are private draft content, never links.
export const MAX_IMAGE_BYTES = 1024 * 1024;
export const MAX_IMAGE_DATA_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 32;
export const MAX_DRAFT_BODY_BYTES = MAX_IMAGE_DATA_LENGTH + 65536;
export function isDraftImage(value: string | null): boolean {
  return Boolean(value?.startsWith("data:image/"));
}
export function imagePayload(value: string): { mime: string; base64: string } | null {
  if (value.length > MAX_IMAGE_DATA_LENGTH) return null;
  const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return null;
  return { mime: match[1], base64: match[2] };
}
