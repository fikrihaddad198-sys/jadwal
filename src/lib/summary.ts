import { ShiftCategory } from "@prisma/client";

export type AssignmentLite = {
  date: Date;
  shiftCode: { hours: number; category: ShiftCategory } | null;
};

export function sumJam(assignments: AssignmentLite[]): number {
  return assignments.reduce((acc, a) => acc + (a.shiftCode?.hours ?? 0), 0);
}

export function countLibur(assignments: AssignmentLite[]): number {
  return assignments.filter((a) => a.shiftCode?.category === "OFF").length;
}

export function jamStatus(
  tipe: "FT" | "PT",
  totalJamPeriode: number,
  targetJamPT: number
): { ok: boolean; label: string } | null {
  if (tipe !== "PT") return null;
  const kurang = targetJamPT - totalJamPeriode;
  if (kurang <= 0) return { ok: true, label: "Jam Terpenuhi" };
  return { ok: false, label: `Kurang ${kurang} jam` };
}

export function validasiLiburHarian(
  jumlahLibur: number,
  liburHarianMin: number,
  liburHarianMax: number
): boolean {
  return jumlahLibur >= liburHarianMin && jumlahLibur <= liburHarianMax;
}

export function validasiLiburMingguan(
  jumlahLibur: number,
  liburMinMinggu: number,
  liburMaxMinggu: number
): boolean {
  return jumlahLibur >= liburMinMinggu && jumlahLibur <= liburMaxMinggu;
}
