-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "passwordVersion" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "aiInsightsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "personalizedRecommendationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "analyticsCollectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthRateLimit" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformUserId" TEXT,
    "displayName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectedAccountId" TEXT NOT NULL,
    "platformPostId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "url" TEXT,
    "tags" TEXT,
    "permalinkUrl" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "retweetCount" INTEGER NOT NULL DEFAULT 0,
    "quoteCount" INTEGER NOT NULL DEFAULT 0,
    "postedAt" DATETIME,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
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

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_userId_platform_key" ON "ConnectedAccount"("userId", "platform");

-- CreateIndex
CREATE INDEX "ContentDraft_userId_scheduledFor_idx" ON "ContentDraft"("userId", "scheduledFor");

-- CreateIndex
CREATE INDEX "ContentDraftTarget_connectedAccountId_idx" ON "ContentDraftTarget"("connectedAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentDraftTarget_contentDraftId_connectedAccountId_key" ON "ContentDraftTarget"("contentDraftId", "connectedAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Post_connectedAccountId_platformPostId_key" ON "Post"("connectedAccountId", "platformPostId");

-- CreateIndex
CREATE INDEX "MetricSnapshot_connectedAccountId_sampleSize_fetchedAt_idx" ON "MetricSnapshot"("connectedAccountId", "sampleSize", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

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
