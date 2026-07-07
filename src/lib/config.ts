import { prisma } from "@/lib/prisma";

export async function getConfig() {
  const config = await prisma.config.findUnique({ where: { id: 1 } });
  if (config) return config;
  return prisma.config.create({
    data: {
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
}
