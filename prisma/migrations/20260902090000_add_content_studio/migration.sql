-- CreateTable
CREATE TABLE "ContentDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContentDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentDraftTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentDraftId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    CONSTRAINT "ContentDraftTarget_contentDraftId_fkey" FOREIGN KEY ("contentDraftId") REFERENCES "ContentDraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContentDraftTarget_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContentDraft_userId_scheduledFor_idx" ON "ContentDraft"("userId", "scheduledFor");

-- CreateIndex
CREATE INDEX "ContentDraftTarget_connectedAccountId_idx" ON "ContentDraftTarget"("connectedAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentDraftTarget_contentDraftId_connectedAccountId_key" ON "ContentDraftTarget"("contentDraftId", "connectedAccountId");
