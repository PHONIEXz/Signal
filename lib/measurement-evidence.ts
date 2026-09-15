import { prisma } from "./prisma.ts";
import { metricsSchemaReady } from "./metric-storage.ts";

export async function attachMeasurementEvidence<T extends { id: string }>(posts: T[]) {
  if (!posts.length || !await metricsSchemaReady()) {
    return posts.map(post => ({ ...post, likeCount: null, viewCount: null, replyCount: null, retweetCount: null, quoteCount: null, measurements: [] }));
  }
  const records = await prisma.post.findMany({
    where: { id: { in: posts.map(post => post.id) } },
    select: { id: true, measurements: { where: { source: { not: "LEGACY" } }, orderBy: { capturedAt: "desc" }, take: 20 } },
  });
  const byId = new Map(records.map(record => [record.id, record.measurements]));
  return posts.map(post => ({ ...post, measurements: byId.get(post.id) ?? [] }));
}
