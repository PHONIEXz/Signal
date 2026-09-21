import { GoogleGenAI } from "@google/genai";
// Configure lazily so a deployment without AI credentials can still serve the app.
export function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("AI credentials missing");
  return new GoogleGenAI({ apiKey });
}
