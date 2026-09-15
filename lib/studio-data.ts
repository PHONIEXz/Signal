import { prisma } from "./prisma.ts";
import { draftInclude } from "./content-drafts.ts";

export async function publishingSchemaReady() {
  const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='ContentPublication'",
  );
  return tables.length === 1;
}

export async function loadStudioDrafts(userId: string) {
  if (!(await publishingSchemaReady())) return null;
  return prisma.contentDraft.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, include: draftInclude });
}
