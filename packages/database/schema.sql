-- ==========================================
-- Corsaire Project: Database Schema
-- ==========================================

-- Drop existing tables to allow re-running the script safely
DROP TABLE IF EXISTS "DeviceTransferRequests", "AppVersions", "LicenseDevices", "Licenses", "Plans", "Devices", "Users" CASCADE;
DROP TABLE IF EXISTS "devicetransferrequests", "appversions", "licensedevices", "licenses", "plans", "devices", "users" CASCADE;

-- 1. Users Table
CREATE TABLE "Users" (
  "ID"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Email"             TEXT UNIQUE NOT NULL,
  "PasswordHash"      TEXT NOT NULL,
  "IsVerified"        BOOLEAN DEFAULT false,
  "IsActive"          BOOLEAN DEFAULT true,
  "Role"              TEXT DEFAULT 'User',
  "CreatedAt"         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_Users_Email" ON "Users"("Email");

-- 2. Devices Table
CREATE TABLE "Devices" (
  "ID"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "UserID"       UUID REFERENCES "Users"("ID") ON DELETE CASCADE,
  "DeviceID"     TEXT NOT NULL,
  "Platform"     TEXT NOT NULL,
  "DeviceName"   TEXT,
  "IsActive"     BOOLEAN DEFAULT true,
  "RegisteredAt" TIMESTAMPTZ DEFAULT NOW(),
  "LastSeenAt"   TIMESTAMPTZ
);
CREATE INDEX "idx_Devices_User" ON "Devices"("UserID");
CREATE INDEX "idx_Devices_DeviceID" ON "Devices"("DeviceID");

-- 3. Plans Table
CREATE TABLE "Plans" (
  "ID"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Name"        TEXT NOT NULL,
  "Apps"        TEXT[] NOT NULL,
  "Price"       DECIMAL(8,2) NOT NULL,
  "IsActive"    BOOLEAN DEFAULT true,
  "CreatedAt"   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Licenses Table
CREATE TABLE "Licenses" (
  "ID"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Code"            TEXT UNIQUE NOT NULL,
  "UserID"          UUID REFERENCES "Users"("ID"),
  "PlanID"          UUID REFERENCES "Plans"("ID"),
  "Status"          TEXT DEFAULT 'inactive',
  "Platform"        TEXT NOT NULL,
  "DeviceLimit"     INTEGER DEFAULT 1,
  "CreatedAt"       TIMESTAMPTZ DEFAULT NOW(),
  "ActivatedAt"     TIMESTAMPTZ,
  "Apps"            TEXT[] NOT NULL
);
CREATE INDEX "idx_Licenses_User" ON "Licenses"("UserID");
CREATE INDEX "idx_Licenses_Code" ON "Licenses"("Code");

-- 5. LicenseDevices Table
CREATE TABLE "LicenseDevices" (
  "LicenseID"     UUID REFERENCES "Licenses"("ID") ON DELETE CASCADE,
  "DeviceID"      UUID REFERENCES "Devices"("ID") ON DELETE CASCADE,
  "BoundAt"       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY ("LicenseID", "DeviceID")
);

-- 6. DeviceTransferRequests Table
CREATE TABLE "DeviceTransferRequests" (
  "ID"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "UserID"                UUID REFERENCES "Users"("ID"),
  "LicenseID"             UUID REFERENCES "Licenses"("ID"),
  "OldDeviceID"           TEXT,
  "NewDeviceID"           TEXT,
  "OldPlatform"           TEXT NOT NULL,
  "NewPlatform"           TEXT NOT NULL,
  "Status"                TEXT DEFAULT 'pending',
  "VerificationVerified"  BOOLEAN DEFAULT false,
  "IsSuspicious"          BOOLEAN DEFAULT false,
  "CreatedAt"             TIMESTAMPTZ DEFAULT NOW(),
  "ResolvedAt"            TIMESTAMPTZ
);

-- 7. AppVersions Table
CREATE TABLE "AppVersions" (
  "ID"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "AppName"         TEXT NOT NULL,    -- 'youtube_ios'|'youtube_android'|'ytmusic_ios'|'ytmusic_android'
  "Version"         TEXT NOT NULL,
  "Changelog"       TEXT,
  "FileURL"         TEXT NOT NULL,    -- R2 URL
  "FileSize"        BIGINT,
  "Checksum"        TEXT NOT NULL,    -- SHA256
  "Source"          TEXT DEFAULT 'manual', -- 'manual' | 'rss_detected'
  "ApprovalStatus"  TEXT DEFAULT 'pending_review', -- 'pending_review'|'approved'|'rejected'
  "IsActive"        BOOLEAN DEFAULT false, -- only true bila ApprovalStatus = 'approved' & published
  "ReleasedAt"      TIMESTAMPTZ DEFAULT NOW(),
  "ApprovedAt"      TIMESTAMPTZ,
  "ApprovedBy"      TEXT              -- Founder identifier
);
CREATE INDEX "idx_Versions_App" ON "AppVersions"("AppName", "ReleasedAt" DESC);

-- ==========================================
-- Permissions (Crucial for API Access)
-- ==========================================
GRANT ALL PRIVILEGES ON "Users" TO service_role;
GRANT ALL PRIVILEGES ON "Devices" TO service_role;
GRANT ALL PRIVILEGES ON "Plans" TO service_role;
GRANT ALL PRIVILEGES ON "Licenses" TO service_role;
GRANT ALL PRIVILEGES ON "LicenseDevices" TO service_role;
GRANT ALL PRIVILEGES ON "DeviceTransferRequests" TO service_role;
GRANT ALL PRIVILEGES ON "AppVersions" TO service_role;

-- ==========================================
-- 8. Seed Plans
-- ==========================================
INSERT INTO "Plans" ("Name", "Apps", "Price") VALUES 
  ('YouTube Only', ARRAY['youtube'], 15.00),
  ('YT Music Only', ARRAY['youtube_music'], 10.00),
  ('YouTube Bundle', ARRAY['youtube', 'youtube_music'], 20.00)
ON CONFLICT DO NOTHING;

