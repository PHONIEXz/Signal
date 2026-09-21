// Match the whole message: "hi, analyse my account" must still reach analysis.
export function conversationalReply(messages: unknown): string | null {
  if (!Array.isArray(messages)) return null;
  const latest = messages.at(-1);
  if (!latest || latest.role !== "user" || typeof latest.content !== "string") return null;
  const text = latest.content.toLowerCase().trim().replace(/[!?. ,]+/g, " ").trim();
  if (/^(hi|hello|hey|hey there|hello there|good morning|good afternoon|good evening)( signal)?$/.test(text)) {
    return "Hi! How can I help you today? I can help with your accounts, content ideas or understanding your results.";
  }
  if (/^(thanks|thank you|thanks a lot|thank you very much)$/.test(text)) return "You're welcome! Let me know if you need anything else.";
  return null;
}

export const CONVERSATIONAL_RULES = `
Respond to the user's actual intent before using account evidence.
For greetings or small talk, respond briefly and naturally; do not introduce metrics, confidence scores or performance advice.
For general content questions, answer the question without an unsolicited account audit.
Use account evidence only when relevant to the user's question. A greeting followed by an analytics question should answer that question.
If the request is ambiguous, ask one short clarifying question. Do not force every answer into an analytics template.
`;
