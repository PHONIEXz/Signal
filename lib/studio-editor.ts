export type EditorContent = { text: string; mediaUrl: string; scheduledFor: string; targetIds: string[] };

export function editorFingerprint(value: EditorContent) {
  return JSON.stringify([value.text, value.mediaUrl, value.scheduledFor, [...value.targetIds].sort()]);
}
