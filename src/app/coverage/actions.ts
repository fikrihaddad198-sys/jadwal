"use server";

import { prisma } from "@/lib/prisma";
import { parseISODate } from "@/lib/period";
import { OPEN_HOUR, CLOSE_HOUR } from "@/lib/coverage";
import { revalidatePath } from "next/cache";

export async function saveHourlySales(dateISO: string, formData: FormData) {
  const date = parseISODate(dateISO);
  const ops = [];
  for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour++) {
    const raw = formData.get(`sales_${hour}`);
    if (raw === null) continue;
    const sales = Number(String(raw).replace(/[^\d.-]/g, "")) || 0;
    ops.push(
      prisma.hourlySale.upsert({
        where: { date_hour: { date, hour } },
        update: { sales },
        create: { date, hour, sales },
      })
    );
  }
  await prisma.$transaction(ops);
  revalidatePath("/coverage");
}
