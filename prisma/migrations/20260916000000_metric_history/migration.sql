-- CreateTable
CREATE TABLE "MetricSync" (
    "connectedAccountId" TEXT NOT NULL PRIMARY KEY,
    "lockId" TEXT,
    "lockUntil" DATETIME,
    "nextAllowedAt" DATETIME,
    "lastAttemptAt" DATETIME,
    "lastSuccessAt" DATETIME,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEVER',
    "requestedPosts" INTEGER NOT NULL DEFAULT 0,
    "receivedPosts" INTEGER NOT NULL DEFAULT 0,
    "missingFields" TEXT,
    "warning" TEXT,
    CONSTRAINT "MetricSync_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PageInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectedAccountId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "value" INTEGER NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageInsight_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectedAccountId" TEXT NOT NULL,
    "platformPostId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "url" TEXT,
    "tags" TEXT,
    "permalinkUrl" TEXT,
    "likeCount" INTEGER,
    "viewCount" INTEGER,
    "replyCount" INTEGER,
    "retweetCount" INTEGER,
    "quoteCount" INTEGER,
    "postedAt" DATETIME,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("connectedAccountId", "fetchedAt", "id", "likeCount", "permalinkUrl", "platformPostId", "postedAt", "quoteCount", "replyCount", "retweetCount", "tags", "text", "url", "viewCount") SELECT "connectedAccountId", "fetchedAt", "id", "likeCount", "permalinkUrl", "platformPostId", "postedAt", "quoteCount", "replyCount", "retweetCount", "tags", "text", "url", "viewCount" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_connectedAccountId_platformPostId_key" ON "Post"("connectedAccountId", "platformPostId");

-- CreateTable
CREATE TABLE "PostMeasurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL,
    "likeCount" INTEGER,
    "viewCount" INTEGER,
    "replyCount" INTEGER,
    "retweetCount" INTEGER,
    "quoteCount" INTEGER,
    "rawLegacy" TEXT,
    CONSTRAINT "PostMeasurement_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PostMeasurement_postId_source_capturedAt_idx" ON "PostMeasurement"("postId", "source", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostMeasurement_postId_sampleId_key" ON "PostMeasurement"("postId", "sampleId");

-- CreateIndex
CREATE UNIQUE INDEX "PageInsight_connectedAccountId_metric_period_periodEnd_key" ON "PageInsight"("connectedAccountId", "metric", "period", "periodEnd");


-- Preserve the old counters as unverified provenance before clearing ambiguous values.
INSERT INTO "PostMeasurement" (id, postId, source, sampleId, capturedAt, rawLegacy)
SELECT 'legacy_' || id, id, 'LEGACY', 'legacy_' || id, fetchedAt,
json_object('likeCount', likeCount, 'viewCount', viewCount, 'replyCount', replyCount, 'retweetCount', retweetCount, 'quoteCount', quoteCount)
FROM "Post";
UPDATE "Post" SET likeCount=NULL, viewCount=NULL, replyCount=NULL, retweetCount=NULL, quoteCount=NULL;
UPDATE "MetricSnapshot" SET postMetricsStatus='LEGACY';
