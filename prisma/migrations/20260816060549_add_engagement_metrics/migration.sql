-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MetricSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectedAccountId" TEXT NOT NULL,
    "followersCount" INTEGER NOT NULL,
    "followingCount" INTEGER NOT NULL,
    "postCount" INTEGER NOT NULL,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "postsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MetricSnapshot_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MetricSnapshot" ("connectedAccountId", "fetchedAt", "followersCount", "followingCount", "id", "postCount") SELECT "connectedAccountId", "fetchedAt", "followersCount", "followingCount", "id", "postCount" FROM "MetricSnapshot";
DROP TABLE "MetricSnapshot";
ALTER TABLE "new_MetricSnapshot" RENAME TO "MetricSnapshot";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
