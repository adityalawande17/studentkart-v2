-- Ensure PostGIS is enabled (idempotent — a no-op if already enabled, e.g. on Supabase)
CREATE EXTENSION IF NOT EXISTS postgis;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "location" geography(Point, 4326);

-- Backfill existing rows from lat/lng
UPDATE "Listing" SET "location" = ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography;

-- Keep location in sync with lat/lng automatically, regardless of write path
CREATE OR REPLACE FUNCTION listing_set_location() RETURNS trigger AS $$
BEGIN
  NEW."location" := ST_SetSRID(ST_MakePoint(NEW."lng", NEW."lat"), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listing_set_location_trigger
BEFORE INSERT OR UPDATE OF "lat", "lng" ON "Listing"
FOR EACH ROW EXECUTE FUNCTION listing_set_location();

-- Spatial index for radius queries
CREATE INDEX "Listing_location_gist_idx" ON "Listing" USING GIST ("location");
