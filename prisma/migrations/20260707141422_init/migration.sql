-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('FT', 'PT');

-- CreateEnum
CREATE TYPE "ShiftCategory" AS ENUM ('FT', 'PT', 'OFF', 'HOLIDAY', 'MEETING');

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "StaffType" NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" "ShiftCategory" NOT NULL DEFAULT 'PT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "shiftCodeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "targetJamPT" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "periodeMulaiTgl" INTEGER NOT NULL DEFAULT 21,
    "periodeSelesaiTgl" INTEGER NOT NULL DEFAULT 20,
    "liburMinMinggu" INTEGER NOT NULL DEFAULT 2,
    "liburMaxMinggu" INTEGER NOT NULL DEFAULT 3,
    "liburHarianMin" INTEGER NOT NULL DEFAULT 2,
    "liburHarianMax" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_nama_key" ON "Staff"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftCode_code_key" ON "ShiftCode"("code");

-- CreateIndex
CREATE INDEX "Assignment_date_idx" ON "Assignment"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_staffId_date_key" ON "Assignment"("staffId", "date");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_shiftCodeId_fkey" FOREIGN KEY ("shiftCodeId") REFERENCES "ShiftCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
