"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateConfig(formData: FormData) {
  const num = (key: string) => Number(formData.get(key) || 0);
  const data = {
    targetJamPT: num("targetJamPT"),
    periodeMulaiTgl: num("periodeMulaiTgl"),
    periodeSelesaiTgl: num("periodeSelesaiTgl"),
    liburMinMinggu: num("liburMinMinggu"),
    liburMaxMinggu: num("liburMaxMinggu"),
    liburHarianMin: num("liburHarianMin"),
    liburHarianMax: num("liburHarianMax"),
    ftDivisor: num("ftDivisor"),
    defaultRatePT: num("defaultRatePT"),
  };
  await prisma.config.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  revalidatePath("/config");
  revalidatePath("/jadwal");
  revalidatePath("/gaji");
}
