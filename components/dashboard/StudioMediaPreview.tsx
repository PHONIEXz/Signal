"use client";
import Image from "next/image";
import { isDraftImage, imagePayload } from "@/lib/draft-image";
import { useState } from "react";
export default function StudioMediaPreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (isDraftImage(url) && imagePayload(url)) return <div className="mt-4 rounded-lg border border-border p-3">
    <Image src={url} alt="Attached draft image" width={600} height={360} unoptimized className="max-h-72 w-full object-contain" />
    <a href={url} download="signal-image.jpg" className="mt-2 inline-block text-xs text-navy underline">Download image</a>
    <p className="mt-1 text-xs text-ink-muted">Publishes as a photo on X. For Facebook or TikTok, download and attach it manually.</p>
  </div>;
  let valid = false;
  try { const parsed = new URL(url); valid = ["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password; } catch { /* Incomplete editor URL. */ }
  if (!valid) return <p className="mt-3 text-xs text-ink-muted">Enter a complete HTTP or HTTPS link for a preview.</p>;
  return <div className="mt-4 overflow-hidden rounded-lg border border-border">
    {!failed && <Image src={url} alt="Draft link preview" width={600} height={360} unoptimized onError={() => setFailed(true)} className="max-h-72 w-full object-contain" />}
    <div className="bg-paper p-3"><p className="text-xs font-medium text-ink">{failed ? "Link attachment" : "Image preview"}</p><a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs text-navy">{url}</a><p className="mt-1 text-xs text-ink-muted">Facebook attaches this link. X includes it in your text. Upload TikTok videos on TikTok.</p></div>
  </div>;
}
