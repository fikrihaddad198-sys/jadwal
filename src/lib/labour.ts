import type { Config, Staff } from "@prisma/client";

type StaffRate = Pick<Staff, "tipe" | "gajiBulanan" | "rateHourly">;
type RateConfig = Pick<Config, "ftDivisor" | "defaultRatePT">;

/** Rate per jam efektif: PT langsung dari rateHourly, FT dari gaji bulanan ÷ pembagi. */
export function hourlyRate(staff: StaffRate, config: RateConfig): number {
  if (staff.tipe === "PT") return staff.rateHourly ?? config.defaultRatePT;
  if (!staff.gajiBulanan || config.ftDivisor <= 0) return 0;
  return staff.gajiBulanan / config.ftDivisor;
}

export function labourCostFor(staff: StaffRate, hours: number, config: RateConfig): number {
  return hours * hourlyRate(staff, config);
}

export function formatRupiah(n: number): string {
  return Math.round(n).toLocaleString("id-ID");
}
