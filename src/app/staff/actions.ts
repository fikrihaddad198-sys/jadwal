"use server";

import { prisma } from "@/lib/prisma";
import { StaffType } from "@prisma/client";
import { revalidatePath } from "next/cache";

function readStaffForm(formData: FormData) {
  const nama = String(formData.get("nama") || "").trim();
  const namaLengkap = String(formData.get("namaLengkap") || "").trim() || null;
  const tipe = String(formData.get("tipe") || "PT") as StaffType;
  const gajiBulanan = Number(formData.get("gajiBulanan")) || null;
  const rateHourly = Number(formData.get("rateHourly")) || null;
  return { nama, namaLengkap, tipe, gajiBulanan, rateHourly };
}

export async function createStaff(formData: FormData) {
  const data = readStaffForm(formData);
  if (!data.nama) return;
  await prisma.staff.create({ data });
  revalidatePath("/staff");
}

export async function updateStaff(id: string, formData: FormData) {
  const data = readStaffForm(formData);
  if (!data.nama) return;
  await prisma.staff.update({ where: { id }, data });
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
