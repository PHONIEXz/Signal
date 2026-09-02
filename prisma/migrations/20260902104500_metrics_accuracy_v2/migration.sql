-- Preserve the difference between a real zero and data that was not available.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

ALTER TABLE "Post" ADD COLUMN "quoteCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "new_MetricSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectedAccountId" TEXT NOT NULL,
    "followersCount" INTEGER NOT NULL,
    "followingCount" INTEGER,
    "postCount" INTEGER,
    "totalLikes" INTEGER,
    "totalViews" INTEGER,
    "totalEngagements" INTEGER,
    "postsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "sampleSize" INTEGER NOT NULL DEFAULT 10,
    "postMetricsStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MetricSnapshot_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_MetricSnapshot" (
    "connectedAccountId",
    "fetchedAt",
    "followersCount",
    "followingCount",
    "id",
    "postCount",
    "totalLikes",
    "totalViews",
    "totalEngagements",
    "postsAnalyzed",
    "sampleSize",
    "postMetricsStatus"
)
SELECT
    old."connectedAccountId",
    old."fetchedAt",
    old."followersCount",
    CASE WHEN account."platform" = 'facebook' THEN NULL ELSE old."followingCount" END,
    old."id",
    CASE WHEN account."platform" = 'facebook' THEN NULL ELSE old."postCount" END,
    CASE WHEN old."postsAnalyzed" = 0 THEN NULL ELSE old."totalLikes" END,
    CASE WHEN old."postsAnalyzed" = 0 OR account."platform" = 'facebook' THEN NULL ELSE old."totalViews" END,
    NULL,
    old."postsAnalyzed",
    10,
    CASE
        WHEN old."postsAnalyzed" = 0 THEN 'UNAVAILABLE'
        WHEN account."platform" = 'facebook' THEN 'PARTIAL'
        ELSE 'LEGACY'
    END
FROM "MetricSnapshot" AS old
JOIN "ConnectedAccount" AS account ON account."id" = old."connectedAccountId";

DROP TABLE "MetricSnapshot";
ALTER TABLE "new_MetricSnapshot" RENAME TO "MetricSnapshot";
CREATE INDEX "MetricSnapshot_connectedAccountId_sampleSize_fetchedAt_idx" ON "MetricSnapshot"("connectedAccountId", "sampleSize", "fetchedAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
