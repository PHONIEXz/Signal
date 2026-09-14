// Shared by signup, password recovery, and the password form.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_BYTES = 72; // bcrypt's input limit, including Unicode.

export function passwordError(value: unknown): string | null {
  if (typeof value !== "string" || value.length < PASSWORD_MIN_LENGTH) {
    return "Use at least 12 characters. A few unrelated words make a good passphrase.";
  }
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) {
    return "Keep your password within 72 bytes (some symbols use more than one byte).";
  }
  return null;
}

export function emailValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function sessionVersionMatches(tokenVersion: unknown, storedVersion: number) {
  // JWTs issued before this migration had no version.
  return (tokenVersion ?? 0) === storedVersion;
}
