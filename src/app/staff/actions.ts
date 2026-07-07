"use server";

import { prisma } from "@/lib/prisma";
import { StaffType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createStaff(formData: FormData) {
  const nama = String(formData.get("nama") || "").trim();
  const tipe = String(formData.get("tipe") || "PT") as StaffType;
  if (!nama) return;
  await prisma.staff.create({ data: { nama, tipe } });
  revalidatePath("/staff");
}

export async function updateStaff(id: string, formData: FormData) {
  const nama = String(formData.get("nama") || "").trim();
  const tipe = String(formData.get("tipe") || "PT") as StaffType;
  if (!nama) return;
  await prisma.staff.update({ where: { id }, data: { nama, tipe } });
  revalidatePath("/staff");
}

export async function toggleAktif(id: string, aktif: boolean) {
  await prisma.staff.update({ where: { id }, data: { aktif } });
  revalidatePath("/staff");
}

export async function deleteStaff(id: string) {
  await prisma.staff.delete({ where: { id } });
  revalidatePath("/staff");
}
