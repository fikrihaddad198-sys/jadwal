"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateConfig(formData: FormData) {
  const num = (key: string) => Number(formData.get(key) || 0);
  await prisma.config.upsert({
    where: { id: 1 },
    update: {
      targetJamPT: num("targetJamPT"),
      periodeMulaiTgl: num("periodeMulaiTgl"),
      periodeSelesaiTgl: num("periodeSelesaiTgl"),
      liburMinMinggu: num("liburMinMinggu"),
      liburMaxMinggu: num("liburMaxMinggu"),
      liburHarianMin: num("liburHarianMin"),
      liburHarianMax: num("liburHarianMax"),
    },
    create: {
      id: 1,
      targetJamPT: num("targetJamPT"),
      periodeMulaiTgl: num("periodeMulaiTgl"),
      periodeSelesaiTgl: num("periodeSelesaiTgl"),
      liburMinMinggu: num("liburMinMinggu"),
      liburMaxMinggu: num("liburMaxMinggu"),
      liburHarianMin: num("liburHarianMin"),
      liburHarianMax: num("liburHarianMax"),
    },
  });
  revalidatePath("/config");
  revalidatePath("/jadwal");
}
