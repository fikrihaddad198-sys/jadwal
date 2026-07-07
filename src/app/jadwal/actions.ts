"use server";

import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/period";
import { revalidatePath } from "next/cache";

export async function setAssignment(staffId: string, dateISO: string, shiftCodeId: string) {
  const date = parseISODate(dateISO);
  if (!shiftCodeId) {
    await prisma.assignment.deleteMany({ where: { staffId, date } });
  } else {
    await prisma.assignment.upsert({
      where: { staffId_date: { staffId, date } },
      update: { shiftCodeId },
      create: { staffId, date, shiftCodeId },
    });
  }
  revalidatePath("/jadwal");
}
