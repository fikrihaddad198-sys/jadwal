"use server";

import { prisma } from "@/lib/prisma";
import { ShiftCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";

function readForm(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const startTime = String(formData.get("startTime") || "").trim() || null;
  const endTime = String(formData.get("endTime") || "").trim() || null;
  const hours = Number(formData.get("hours") || 0);
  const category = String(formData.get("category") || "PT") as ShiftCategory;
  return { code, startTime, endTime, hours, category };
}

export async function createShiftCode(formData: FormData) {
  const data = readForm(formData);
  if (!data.code) return;
  await prisma.shiftCode.create({ data });
  revalidatePath("/shift-codes");
}

export async function updateShiftCode(id: string, formData: FormData) {
  const data = readForm(formData);
  if (!data.code) return;
  await prisma.shiftCode.update({ where: { id }, data });
  revalidatePath("/shift-codes");
}

export async function deleteShiftCode(id: string) {
  await prisma.shiftCode.delete({ where: { id } });
  revalidatePath("/shift-codes");
}
