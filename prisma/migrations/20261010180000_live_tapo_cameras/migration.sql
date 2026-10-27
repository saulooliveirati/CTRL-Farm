CREATE TYPE "CameraQuality" AS ENUM ('HIGH', 'STANDARD');

CREATE TABLE "Camera" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "model" TEXT,
  "ipAddress" TEXT NOT NULL,
  "quality" "CameraQuality" NOT NULL DEFAULT 'HIGH',
  "username" TEXT NOT NULL,
  "passwordCiphertext" TEXT NOT NULL,
  "passwordIv" TEXT NOT NULL,
  "passwordTag" TEXT NOT NULL,
  "streamPath" TEXT NOT NULL,
  "streamConfigured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Camera_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Camera_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Camera_streamPath_key" ON "Camera"("streamPath");
CREATE UNIQUE INDEX "Camera_companyId_name_key" ON "Camera"("companyId", "name");
CREATE INDEX "Camera_companyId_createdAt_idx" ON "Camera"("companyId", "createdAt");
