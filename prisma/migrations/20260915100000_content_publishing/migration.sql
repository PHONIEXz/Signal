CREATE TABLE "ContentPublication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentDraftId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "platformPostId" TEXT,
    "permalinkUrl" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "attemptedAt" DATETIME,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContentPublication_contentDraftId_fkey" FOREIGN KEY ("contentDraftId") REFERENCES "ContentDraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContentPublication_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ContentPublication_contentDraftId_connectedAccountId_key" ON "ContentPublication"("contentDraftId", "connectedAccountId");
CREATE INDEX "ContentPublication_connectedAccountId_status_idx" ON "ContentPublication"("connectedAccountId", "status");
