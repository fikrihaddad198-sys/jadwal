-- CreateTable
CREATE TABLE "HourlySale" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "sales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HourlySale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HourlySale_date_idx" ON "HourlySale"("date");

-- CreateIndex
CREATE UNIQUE INDEX "HourlySale_date_hour_key" ON "HourlySale"("date", "hour");
