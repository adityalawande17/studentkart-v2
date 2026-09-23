-- CreateIndex
CREATE INDEX "Listing_location_idx" ON "Listing" USING GIST ("location");
