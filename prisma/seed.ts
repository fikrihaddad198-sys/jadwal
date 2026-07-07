import { PrismaClient, StaffType, ShiftCategory } from "@prisma/client";

const prisma = new PrismaClient();

function parseDuration(hms: string): number {
  const [h, m] = hms.split(":").map(Number);
  return Math.round((h + m / 60) * 100) / 100;
}

const ftShiftCodes: { code: string; start: string; end: string; hours: number }[] = [
  { code: "OP20", start: "6:00", end: "12:00", hours: 5 },
  { code: "OP1", start: "6:00", end: "14:00", hours: 7 },
  { code: "OP25", start: "9:00", end: "15:00", hours: 5 },
  { code: "MD", start: "9:00", end: "17:00", hours: 7 },
  { code: "OP24", start: "10:00", end: "16:00", hours: 5 },
  { code: "MD2", start: "10:00", end: "18:00", hours: 7 },
  { code: "MD10", start: "12:00", end: "18:00", hours: 5 },
  { code: "MD4", start: "12:00", end: "20:00", hours: 7 },
  { code: "CL4", start: "15:00", end: "23:00", hours: 7 },
  { code: "CL16", start: "17:00", end: "23:00", hours: 5 },
  { code: "CT21", start: "", end: "", hours: 5 },
  { code: "OP5", start: "8:00", end: "16:00", hours: 7 },
  { code: "OP22", start: "8:00", end: "14:00", hours: 5 },
  { code: "MD9", start: "11:00", end: "17:00", hours: 5 },
  { code: "CL", start: "13:00", end: "21:00", hours: 7 },
  { code: "MD3", start: "11:00", end: "19:00", hours: 7 },
  { code: "OP7", start: "7:00", end: "15:00", hours: 7 },
  { code: "OP21", start: "7:00", end: "13:00", hours: 5 },
  { code: "MD11", start: "13:00", end: "19:00", hours: 5 },
];

const ptShiftCodes: { code: string; start: string; end: string; duration: string }[] = [
  { code: "PT7", start: "12:00", end: "16:00", duration: "4:00:00" },
  { code: "PT8", start: "13:00", end: "17:00", duration: "4:00:00" },
  { code: "PT6", start: "11:00", end: "15:00", duration: "4:00:00" },
  { code: "PT103", start: "11:00", end: "14:00", duration: "3:00:00" },
  { code: "PT104", start: "12:00", end: "15:00", duration: "3:00:00" },
  { code: "PT105", start: "15:00", end: "18:00", duration: "3:00:00" },
  { code: "PT106", start: "18:00", end: "21:00", duration: "3:00:00" },
  { code: "PT108", start: "19:00", end: "22:00", duration: "3:00:00" },
  { code: "PT109", start: "19:30", end: "22:30", duration: "3:00:00" },
  { code: "PT118", start: "14:00", end: "17:00", duration: "3:00:00" },
  { code: "PT1", start: "7:00", end: "11:00", duration: "4:00:00" },
  { code: "PT5", start: "10:00", end: "17:00", duration: "7:00:00" },
  { code: "PT37", start: "8:30", end: "12:00", duration: "3:30:00" },
  { code: "PT10", start: "15:00", end: "19:00", duration: "4:00:00" },
  { code: "PT11", start: "15:30", end: "19:30", duration: "4:00:00" },
  { code: "PT13", start: "17:00", end: "21:00", duration: "4:00:00" },
  { code: "PT14", start: "18:00", end: "22:00", duration: "4:00:00" },
  { code: "PT2", start: "8:00", end: "12:00", duration: "4:00:00" },
  { code: "PT28", start: "10:30", end: "14:30", duration: "4:00:00" },
  { code: "PT3", start: "9:00", end: "13:00", duration: "4:00:00" },
  { code: "PT31", start: "16:30", end: "20:30", duration: "4:00:00" },
  { code: "PT32", start: "14:30", end: "18:30", duration: "4:00:00" },
  { code: "PT33", start: "7:30", end: "11:30", duration: "4:00:00" },
  { code: "PT35", start: "6:30", end: "10:30", duration: "4:00:00" },
  { code: "PT39", start: "17:30", end: "21:30", duration: "4:00:00" },
  { code: "PT4", start: "9:30", end: "13:30", duration: "4:00:00" },
  { code: "PT43", start: "18:30", end: "22:30", duration: "4:00:00" },
  { code: "PT50", start: "19:00", end: "23:00", duration: "4:00:00" },
  { code: "PT53", start: "6:00", end: "10:00", duration: "4:00:00" },
  { code: "PT69", start: "5:00", end: "9:00", duration: "4:00:00" },
  { code: "PT70", start: "4:00", end: "8:00", duration: "4:00:00" },
  { code: "PT84", start: "19:30", end: "23:30", duration: "4:00:00" },
  { code: "PT9", start: "14:00", end: "18:00", duration: "4:00:00" },
  { code: "D450", start: "8:30", end: "13:00", duration: "4:30:00" },
  { code: "P073", start: "9:00", end: "14:00", duration: "5:00:00" },
  { code: "PT112", start: "6:30", end: "11:30", duration: "5:00:00" },
  { code: "PT113", start: "9:30", end: "14:30", duration: "5:00:00" },
  { code: "PT52", start: "19:00", end: "23:59", duration: "4:59:00" },
  { code: "PT57", start: "6:00", end: "11:00", duration: "5:00:00" },
  { code: "PT59", start: "17:00", end: "22:00", duration: "5:00:00" },
  { code: "PT74", start: "18:30", end: "23:30", duration: "5:00:00" },
  { code: "PT75", start: "9:00", end: "14:00", duration: "5:00:00" },
  { code: "PT76", start: "12:00", end: "17:00", duration: "5:00:00" },
  { code: "PT77", start: "8:00", end: "13:00", duration: "5:00:00" },
  { code: "PT78", start: "15:00", end: "20:00", duration: "5:00:00" },
  { code: "PT79", start: "16:00", end: "21:00", duration: "5:00:00" },
];

const staffSeed: { nama: string; tipe: StaffType; aktif: boolean }[] = [
  { nama: "RIHANA", tipe: "PT", aktif: true },
  { nama: "DIKY", tipe: "PT", aktif: true },
  { nama: "ASRI", tipe: "PT", aktif: true },
  { nama: "ANDRA", tipe: "PT", aktif: true },
  { nama: "ASNU", tipe: "PT", aktif: true },
  { nama: "ARI", tipe: "PT", aktif: true },
  { nama: "AXEL", tipe: "PT", aktif: true },
  { nama: "RARA", tipe: "PT", aktif: true },
  { nama: "KEVIN", tipe: "PT", aktif: true },
];

async function main() {
  await prisma.config.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      targetJamPT: 100,
      periodeMulaiTgl: 21,
      periodeSelesaiTgl: 20,
      liburMinMinggu: 2,
      liburMaxMinggu: 3,
      liburHarianMin: 2,
      liburHarianMax: 3,
    },
  });

  await prisma.shiftCode.upsert({
    where: { code: "dayoff" },
    update: {},
    create: { code: "dayoff", startTime: null, endTime: null, hours: 0, category: ShiftCategory.OFF },
  });
  await prisma.shiftCode.upsert({
    where: { code: "PH" },
    update: {},
    create: { code: "PH", startTime: null, endTime: null, hours: 0, category: ShiftCategory.HOLIDAY },
  });
  await prisma.shiftCode.upsert({
    where: { code: "meeting" },
    update: {},
    create: { code: "meeting", startTime: null, endTime: null, hours: 0, category: ShiftCategory.MEETING },
  });

  for (const s of ftShiftCodes) {
    await prisma.shiftCode.upsert({
      where: { code: s.code },
      update: {},
      create: {
        code: s.code,
        startTime: s.start || null,
        endTime: s.end || null,
        hours: s.hours,
        category: ShiftCategory.FT,
      },
    });
  }

  for (const s of ptShiftCodes) {
    await prisma.shiftCode.upsert({
      where: { code: s.code },
      update: {},
      create: {
        code: s.code,
        startTime: s.start,
        endTime: s.end,
        hours: parseDuration(s.duration),
        category: ShiftCategory.PT,
      },
    });
  }

  for (const s of staffSeed) {
    await prisma.staff.upsert({
      where: { nama: s.nama },
      update: {},
      create: s,
    });
  }

  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
