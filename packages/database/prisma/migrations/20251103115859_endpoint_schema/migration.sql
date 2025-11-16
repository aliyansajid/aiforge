-- CreateEnum
CREATE TYPE "EndpointAccessType" AS ENUM ('PUBLIC', 'PRIVATE', 'PAID');

-- CreateEnum
CREATE TYPE "EndpointStatus" AS ENUM ('UPLOADING', 'BUILDING', 'DEPLOYING', 'DEPLOYED', 'FAILED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Endpoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelFramework" TEXT NOT NULL,
    "modelPath" TEXT NOT NULL,
    "modelSize" BIGINT NOT NULL,
    "imageUrl" TEXT,
    "serviceUrl" TEXT,
    "apiKey" TEXT NOT NULL,
    "accessType" "EndpointAccessType" NOT NULL DEFAULT 'PRIVATE',
    "status" "EndpointStatus" NOT NULL DEFAULT 'UPLOADING',
    "memoryLimit" TEXT NOT NULL DEFAULT '2Gi',
    "cpuLimit" TEXT NOT NULL DEFAULT '2',
    "minInstances" INTEGER NOT NULL DEFAULT 0,
    "maxInstances" INTEGER NOT NULL DEFAULT 10,
    "pricePerRequest" DECIMAL(10,4),
    "pricePerMonth" DECIMAL(10,2),
    "errorMessage" TEXT,
    "deployedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "apiKey" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "cost" DECIMAL(10,6),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Endpoint_apiKey_key" ON "Endpoint"("apiKey");

-- CreateIndex
CREATE INDEX "Endpoint_projectId_idx" ON "Endpoint"("projectId");

-- CreateIndex
CREATE INDEX "Endpoint_slug_idx" ON "Endpoint"("slug");

-- CreateIndex
CREATE INDEX "Endpoint_status_idx" ON "Endpoint"("status");

-- CreateIndex
CREATE INDEX "Endpoint_apiKey_idx" ON "Endpoint"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "Endpoint_projectId_slug_key" ON "Endpoint"("projectId", "slug");

-- CreateIndex
CREATE INDEX "ApiUsage_endpointId_idx" ON "ApiUsage"("endpointId");

-- CreateIndex
CREATE INDEX "ApiUsage_timestamp_idx" ON "ApiUsage"("timestamp");

-- CreateIndex
CREATE INDEX "ApiUsage_apiKey_idx" ON "ApiUsage"("apiKey");

-- AddForeignKey
ALTER TABLE "Endpoint" ADD CONSTRAINT "Endpoint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiUsage" ADD CONSTRAINT "ApiUsage_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "Endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
