import sharp from "sharp";
import { imagePayload, isDraftImage } from "./draft-image.ts";

export async function normalizeDraftMedia(value: string): Promise<string> {
  if (!isDraftImage(value)) return value;
  const payload = imagePayload(value);
  if (!payload) throw new Error("Choose a JPEG or PNG image up to 1 MB.");
  try {
    const bytes = Buffer.from(payload.base64, "base64");
    if (bytes.toString("base64") !== payload.base64) throw new Error();
    const image = sharp(bytes, { limitInputPixels: 12000000, failOn: "warning" });
    const metadata = await image.metadata();
    if (!["jpeg", "png"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) throw new Error();
    const output = await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }).jpeg({ quality: 80 }).toBuffer();
    if (output.length > 256 * 1024) throw new Error();
    return `data:image/jpeg;base64,${output.toString("base64")}`;
  } catch { throw new Error("This image could not be prepared. Choose a smaller JPEG or PNG (up to 1 MB and 12 megapixels)."); }
}
