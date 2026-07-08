"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setAssignment, generateWeekSchedule } from "./actions";

type Day = {
  iso: string;
  hari: string;
  tanggal: string;
  weekIndex: number;
  isToday: boolean;
  isMinggu: boolean;
};
type WeekMeta = { index: number; label: string; span: number };
type StaffRow = { id: string; nama: string; tipe: "FT" | "PT"; ratePerJam: number };
type Code = {
  id: string;
  code: string;
  category: "FT" | "PT" | "OFF" | "HOLIDAY" | "MEETING";
  hours: number;
  startTime: string | null;
  endTime: string | null;
};
type Rules = {
  targetJamPT: number;
  liburMinMinggu: number;
  liburMaxMinggu: number;
  liburHarianMin: number;
  liburHarianMax: number;
};

const CELL_STYLE: Record<string, string> = {
  FT: "bg-sky-50 text-sky-900",
  PT: "bg-emerald-50 text-emerald-900",
  OFF: "bg-zinc-100 text-zinc-400",
  HOLIDAY: "bg-violet-50 text-violet-800",
  MEETING: "bg-amber-50 text-amber-800",
};

function formatRupiah(n: number): string {
  return Math.round(n).toLocaleString("id-ID");
}

export function ScheduleGrid({
  periodStartISO,
  days,
  weeks,
  staff,
  codes,
  initialCells,
  rules,
}: {
  periodStartISO: string;
  days: Day[];
  weeks: WeekMeta[];
  staff: StaffRow[];
  codes: Code[];
  initialCells: Record<string, string>;
  rules: Rules;
}) {
  const router = useRouter();
  const [cells, setCells] = useState<Record<string, string | null>>(initialCells);
  const [pending, setPending] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    key: string;
    row: number;
    col: number;
    draft: string;
    open: boolean;
    highlight: number;
    rect: { top: number; left: number } | null;
  } | null>(null);
  const [genConfirm, setGenConfirm] = useState<number | null>(null);
  const [genPending, setGenPending] = useState<number | null>(null);
  const [genMessage, setGenMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const codeById = useMemo(() => new Map(codes.map((c) => [c.id, c])), [codes]);
  const allowedFor = useMemo(() => {
    const shared = codes.filter((c) => ["OFF", "HOLIDAY", "MEETING"].includes(c.category));
    return {
      FT: [...codes.filter((c) => c.category === "FT"), ...shared],
      PT: [...codes.filter((c) => c.category === "PT"), ...shared],
    };
  }, [codes]);

  const offCodeFor = (tipe: "FT" | "PT") => {
    const offs = allowedFor[tipe].filter((c) => c.category === "OFF");
    return offs.find((c) => c.code.toLowerCase().includes("dayoff")) ?? offs[0] ?? null;
  };

  function suggestionsFor(qRaw: string, tipe: "FT" | "PT"): Code[] {
    const q = qRaw.trim().toLowerCase();
    const allowed = allowedFor[tipe];
    if (!q) return allowed.slice(0, 20);
    const out: Code[] = [];
    const seen = new Set<string>();
    const push = (c: Code) => {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
      }
    };
    if (/^\d+([.,]\d+)?$/.test(q)) {
      const num = Number(q.replace(",", "."));
      allowed.filter((c) => c.hours === num).forEach(push);
    }
    allowed.filter((c) => c.code.toLowerCase().startsWith(q)).forEach(push);
    allowed.filter((c) => c.code.toLowerCase().includes(q)).forEach(push);
    return out.slice(0, 20);
  }

  const suggestions = useMemo(() => {
    if (!editing) return [];
    const s = staff[editing.row];
    return s ? suggestionsFor(editing.draft, s.tipe) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.draft, editing?.row]);

  function displayValue(key: string): string {
    const id = cells[key];
    return id ? codeById.get(id)?.code ?? "" : "";
  }

  function flash(key: string) {
    setFlashKey(key);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashKey(null), 1000);
  }

  function save(key: string, staffId: string, iso: string, codeId: string | null) {
    const prev = cells[key] ?? null;
    if (prev === codeId) return;
    setCells((c) => ({ ...c, [key]: codeId }));
    setPending((p) => p + 1);
    setSaveError(null);
    setAssignment(staffId, iso, codeId ?? "")
      .catch(() => {
        setCells((c) => ({ ...c, [key]: prev }));
        setSaveError("Gagal menyimpan — periksa koneksi lalu coba lagi.");
        flash(key);
      })
      .finally(() => setPending((p) => p - 1));
  }

  /** strict=true (blur): jangan pakai saran tersorot — hanya input yang tak ambigu. */
  function resolveDraft(
    draft: string,
    tipe: "FT" | "PT",
    strict: boolean
  ): { ok: true; codeId: string | null } | { ok: false } {
    const q = draft.trim().toLowerCase();
    if (q === "") return { ok: true, codeId: null };
    if (["off", "libur", "x", "dayoff"].includes(q)) {
      const off = offCodeFor(tipe);
      return off ? { ok: true, codeId: off.id } : { ok: false };
    }
    const allowed = allowedFor[tipe];
    const exact = allowed.find((c) => c.code.toLowerCase() === q);
    if (exact) return { ok: true, codeId: exact.id };
    if (/^\d+([.,]\d+)?$/.test(q)) {
      const num = Number(q.replace(",", "."));
      if (num === 0) {
        const off = offCodeFor(tipe);
        return off ? { ok: true, codeId: off.id } : { ok: false };
      }
      const matches = allowed.filter((c) => c.hours === num && c.category !== "OFF");
      if (matches.length > 0) {
        if (!strict && suggestions.length > 0) {
          const pick = suggestions[Math.min(editing?.highlight ?? 0, suggestions.length - 1)];
          if (pick.hours === num) return { ok: true, codeId: pick.id };
        }
        return { ok: true, codeId: matches[0].id };
      }
      // tidak ada shift dengan jam persis itu — pakai saran tersorot (mis. "4" → OP24)
      if (!strict && suggestions.length > 0) {
        const pick = suggestions[Math.min(editing?.highlight ?? 0, suggestions.length - 1)];
        return { ok: true, codeId: pick.id };
      }
      return { ok: false };
    }
    if (!strict && suggestions.length > 0) {
      const pick = suggestions[Math.min(editing?.highlight ?? 0, suggestions.length - 1)];
      return { ok: true, codeId: pick.id };
    }
    return { ok: false };
  }

  function commitEditing(strict: boolean): boolean {
    if (!editing) return true;
    const s = staff[editing.row];
    const day = days[editing.col];
    if (!s || !day) return true;
    const key = editing.key;
    if (editing.draft === displayValue(key)) return true;
    const resolved = resolveDraft(editing.draft, s.tipe, strict);
    if (!resolved.ok) {
      flash(key);
      return false;
    }
    save(key, s.id, day.iso, resolved.codeId);
    return true;
  }

  function focusCell(row: number, col: number) {
    if (row < 0 || row >= staff.length || col < 0 || col >= days.length) return;
    document.getElementById(`cell-${row}-${col}`)?.focus();
  }

  function pickSuggestion(c: Code) {
    if (!editing) return;
    const s = staff[editing.row];
    const day = days[editing.col];
    if (!s || !day) return;
    save(editing.key, s.id, day.iso, c.id);
    setEditing(null);
  }

  async function runGenerate(weekIndex: number) {
    setGenConfirm(null);
    setGenPending(weekIndex);
    setGenMessage(null);
    try {
      const result = await generateWeekSchedule(periodStartISO, weekIndex);
      if (result?.ok) {
        setGenMessage({ ok: true, text: `✓ Minggu ${weekIndex + 1}: ${result.count} shift dibuat` });
        router.refresh();
      } else {
        setGenMessage({ ok: false, text: `Gagal: ${result?.error ?? "error tidak diketahui"}` });
      }
    } catch (e) {
      setGenMessage({ ok: false, text: `Gagal: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setGenPending(null);
    }
  }

  // Totals
  const totals = useMemo(() => {
    const perStaff = staff.map((s) => {
      let jam = 0;
      let libur = 0;
      for (const d of days) {
        const c = cells[`${s.id}|${d.iso}`];
        const code = c ? codeById.get(c) : null;
        if (!code) continue;
        jam += code.hours;
        if (code.category === "OFF") libur++;
      }
      return { jam, libur, cost: jam * s.ratePerJam };
    });
    const perDay = days.map((d) => {
      let masuk = 0;
      let libur = 0;
      let jam = 0;
      for (const s of staff) {
        const c = cells[`${s.id}|${d.iso}`];
        const code = c ? codeById.get(c) : null;
        if (!code) continue;
        if (code.category === "OFF") libur++;
        else if (code.hours > 0) masuk++;
        jam += code.hours;
      }
      return { masuk, libur, jam };
    });
    return { perStaff, perDay };
  }, [cells, staff, days, codeById]);

  const grandCost = totals.perStaff.reduce((a, t) => a + t.cost, 0);

  const rows: Array<{ type: "group"; label: string } | { type: "staff"; index: number }> = [];
  let lastTipe: string | null = null;
  staff.forEach((s, i) => {
    if (s.tipe !== lastTipe) {
      rows.push({ type: "group", label: s.tipe === "FT" ? "Full Time" : "Part Time" });
      lastTipe = s.tipe;
    }
    rows.push({ type: "staff", index: i });
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-white px-4 py-2.5 text-xs shadow-sm ring-1 ring-zinc-950/5">
        <span className="font-semibold uppercase tracking-wide text-zinc-400">Legenda</span>
        {[
          ["FT", "Shift FT"],
          ["PT", "Shift PT"],
          ["OFF", "Libur"],
          ["HOLIDAY", "PH"],
        ].map(([cat, label]) => (
          <span key={cat} className="flex items-center gap-1.5 text-zinc-600">
            <span className={`inline-block h-3 w-3 rounded ${CELL_STYLE[cat].split(" ")[0]} ring-1 ring-zinc-950/10`} />
            {label}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-3">
          {genMessage && (
            <span
              className={`rounded-md px-2 py-1 font-medium ${
                genMessage.ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
              }`}
            >
              {genMessage.text}
            </span>
          )}
          {saveError && (
            <span className="rounded-md bg-red-100 px-2 py-1 font-medium text-red-700">{saveError}</span>
          )}
          {pending > 0 ? (
            <span className="flex items-center gap-1.5 font-medium text-indigo-600">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              Menyimpan...
            </span>
          ) : (
            <span className="font-medium text-emerald-600">✓ Tersimpan otomatis</span>
          )}
        </span>
      </div>

      {/* Grid */}
      <div
        className="grid-scroll overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5"
        onScroll={() => {
          if (editing?.open) setEditing((e) => (e ? { ...e, open: false } : e));
        }}
      >
        <table className="w-full border-separate border-spacing-0 text-[11px]">
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 top-0 z-30 min-w-[130px] border-b border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-left font-semibold"
              >
                Nama
              </th>
              {weeks.map((w) => (
                <th
                  key={w.index}
                  colSpan={w.span}
                  className="border-b border-l-2 border-zinc-200 border-l-zinc-300 bg-zinc-50 px-2 py-1.5 text-center"
                >
                  <span className="mr-2 font-bold uppercase tracking-wide text-zinc-500">{w.label}</span>
                  {genConfirm === w.index ? (
                    <span className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => runGenerate(w.index)}
                        className="rounded bg-indigo-600 px-2 py-0.5 font-semibold text-white hover:bg-indigo-500"
                      >
                        Timpa?
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenConfirm(null)}
                        className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-50"
                      >
                        ✕
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={genPending !== null}
                      onClick={() => setGenConfirm(w.index)}
                      className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
                      title={`Generate otomatis ${w.label}`}
                    >
                      {genPending === w.index ? "..." : "⚡ auto"}
                    </button>
                  )}
                </th>
              ))}
              {["Jam", "Libur", "Est. Cost", "Status"].map((h) => (
                <th
                  key={h}
                  rowSpan={2}
                  className="border-b border-l border-zinc-200 bg-zinc-50 px-2 py-2 text-right font-semibold first:border-l-2"
                >
                  {h}
                </th>
              ))}
            </tr>
            <tr>
              {days.map((d, i) => {
                const weekStart = i > 0 && days[i - 1].weekIndex !== d.weekIndex;
                return (
                  <th
                    key={d.iso}
                    className={`border-b border-zinc-200 px-1 py-1.5 text-center font-medium ${
                      weekStart ? "border-l-2 border-l-zinc-300" : "border-l border-zinc-100"
                    } ${d.isToday ? "bg-indigo-600 text-white" : d.isMinggu ? "bg-red-50 text-red-600" : "bg-zinc-50 text-zinc-500"}`}
                  >
                    <div className="font-semibold">{d.hari}</div>
                    <div className={d.isToday ? "text-indigo-200" : "text-zinc-400"}>{d.tanggal}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              if (r.type === "group") {
                return (
                  <tr key={r.label}>
                    <td
                      colSpan={days.length + 5}
                      className="border-b border-zinc-200 bg-zinc-100/70 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400"
                    >
                      {r.label}
                    </td>
                  </tr>
                );
              }
              const rowIdx = r.index;
              const s = staff[rowIdx];
              const t = totals.perStaff[rowIdx];
              const status =
                s.tipe === "PT"
                  ? rules.targetJamPT - t.jam <= 0
                    ? { ok: true, label: "Terpenuhi" }
                    : { ok: false, label: `Kurang ${rules.targetJamPT - t.jam}j` }
                  : null;
              return (
                <tr key={s.id} className="group/row">
                  <td className="sticky left-0 z-10 whitespace-nowrap border-b border-r border-zinc-100 border-r-zinc-200 bg-white px-3 py-1 font-semibold group-hover/row:bg-zinc-50">
                    {s.nama}
                    <span
                      className={`ml-1.5 rounded px-1 py-px text-[9px] font-bold ${
                        s.tipe === "FT" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {s.tipe}
                    </span>
                  </td>
                  {days.map((d, colIdx) => {
                    const key = `${s.id}|${d.iso}`;
                    const isEditing = editing?.key === key;
                    const value = isEditing ? editing.draft : displayValue(key);
                    const code = cells[key] ? codeById.get(cells[key]!) : null;
                    const weekStart = colIdx > 0 && days[colIdx - 1].weekIndex !== d.weekIndex;
                    const tint = flashKey === key
                      ? "bg-red-100 text-red-700 ring-1 ring-inset ring-red-400"
                      : code
                        ? CELL_STYLE[code.category] ?? ""
                        : d.isToday
                          ? "bg-indigo-50/60"
                          : "bg-white";
                    return (
                      <td
                        key={d.iso}
                        className={`border-b border-zinc-100 p-0 ${
                          weekStart ? "border-l-2 border-l-zinc-300" : "border-l border-zinc-100"
                        }`}
                      >
                        <input
                          id={`cell-${rowIdx}-${colIdx}`}
                          value={value}
                          autoComplete="off"
                          spellCheck={false}
                          className={`h-7 w-14 text-center font-semibold outline-none transition-colors focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${tint}`}
                          onFocus={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setEditing({
                              key,
                              row: rowIdx,
                              col: colIdx,
                              draft: displayValue(key),
                              open: false,
                              highlight: 0,
                              rect: { top: rect.bottom + 2, left: rect.left },
                            });
                            e.currentTarget.select();
                          }}
                          onChange={(e) => {
                            const draft = e.target.value;
                            setEditing((ed) => (ed ? { ...ed, draft, open: true, highlight: 0 } : ed));
                          }}
                          onKeyDown={(e) => {
                            if (!editing) return;
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (commitEditing(false)) {
                                setEditing(null);
                                focusCell(rowIdx + 1, colIdx);
                              }
                            } else if (e.key === "Tab") {
                              if (!commitEditing(false)) e.preventDefault();
                              else setEditing(null);
                            } else if (e.key === "Escape") {
                              setEditing((ed) =>
                                ed ? { ...ed, draft: displayValue(key), open: false } : ed
                              );
                            } else if (e.key === "ArrowDown") {
                              e.preventDefault();
                              if (editing.open && suggestions.length > 0) {
                                setEditing((ed) =>
                                  ed ? { ...ed, highlight: Math.min(ed.highlight + 1, suggestions.length - 1) } : ed
                                );
                              } else if (commitEditing(false)) {
                                setEditing(null);
                                focusCell(rowIdx + 1, colIdx);
                              }
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              if (editing.open && suggestions.length > 0) {
                                setEditing((ed) => (ed ? { ...ed, highlight: Math.max(ed.highlight - 1, 0) } : ed));
                              } else if (commitEditing(false)) {
                                setEditing(null);
                                focusCell(rowIdx - 1, colIdx);
                              }
                            } else if (e.key === "ArrowLeft" && editing.draft === displayValue(key)) {
                              e.preventDefault();
                              if (commitEditing(false)) {
                                setEditing(null);
                                focusCell(rowIdx, colIdx - 1);
                              }
                            } else if (e.key === "ArrowRight" && editing.draft === displayValue(key)) {
                              e.preventDefault();
                              if (commitEditing(false)) {
                                setEditing(null);
                                focusCell(rowIdx, colIdx + 1);
                              }
                            }
                          }}
                          onBlur={() => {
                            commitEditing(true);
                            setEditing(null);
                          }}
                        />
                      </td>
                    );
                  })}
                  <td className="border-b border-l-2 border-zinc-100 border-l-zinc-200 px-2 py-1 text-right font-bold tabular-nums">
                    {t.jam}
                  </td>
                  <td className="border-b border-l border-zinc-100 px-2 py-1 text-right tabular-nums text-zinc-500">
                    {t.libur}
                  </td>
                  <td className="whitespace-nowrap border-b border-l border-zinc-100 px-2 py-1 text-right tabular-nums text-zinc-500">
                    {formatRupiah(t.cost)}
                  </td>
                  <td className="whitespace-nowrap border-b border-l border-zinc-100 px-2 py-1 text-right">
                    {status && (
                      <span
                        className={`rounded px-1.5 py-px text-[10px] font-semibold ${
                          status.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                        }`}
                      >
                        {status.label}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {staff.length === 0 && (
              <tr>
                <td colSpan={days.length + 5} className="px-4 py-10 text-center text-sm text-zinc-400">
                  Belum ada staff aktif — tambahkan dulu di halaman Staff.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            {(
              [
                ["Masuk", (i: number) => <span>{totals.perDay[i].masuk}</span>],
                [
                  "Libur",
                  (i: number) => {
                    const { masuk, libur } = totals.perDay[i];
                    const kosong = masuk + libur === 0;
                    const ok = kosong || (libur >= rules.liburHarianMin && libur <= rules.liburHarianMax);
                    return <span className={ok ? "" : "font-bold text-red-600"}>{libur}</span>;
                  },
                ],
                ["Jam", (i: number) => <span className="font-semibold">{totals.perDay[i].jam}</span>],
              ] as Array<[string, (i: number) => React.ReactNode]>
            ).map(([label, render]) => (
              <tr key={label as string}>
                <td className="sticky left-0 z-10 border-r border-t border-zinc-200 bg-zinc-50 px-3 py-1 font-semibold text-zinc-500">
                  {label as string}
                </td>
                {days.map((d, i) => {
                  const weekStart = i > 0 && days[i - 1].weekIndex !== d.weekIndex;
                  return (
                    <td
                      key={d.iso}
                      className={`border-t border-zinc-200 px-1 py-1 text-center tabular-nums ${
                        weekStart ? "border-l-2 border-l-zinc-300" : "border-l border-zinc-100"
                      } bg-zinc-50 text-zinc-600`}
                    >
                      {(render as (i: number) => React.ReactNode)(i)}
                    </td>
                  );
                })}
                <td
                  colSpan={4}
                  className="border-l-2 border-t border-zinc-200 border-l-zinc-200 bg-zinc-50 px-2 py-1 text-right font-semibold text-zinc-600"
                >
                  {label === "Jam" && `Total cost: Rp ${formatRupiah(grandCost)}`}
                </td>
              </tr>
            ))}
          </tfoot>
        </table>

        {/* Dropdown saran */}
        {editing?.open && editing.rect && suggestions.length > 0 && (
          <div
            className="fixed z-50 max-h-56 w-52 overflow-y-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5 py-1 shadow-xl"
            style={{ top: editing.rect.top, left: Math.min(editing.rect.left, typeof window !== "undefined" ? window.innerWidth - 220 : editing.rect.left) }}
          >
            {suggestions.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickSuggestion(c);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs ${
                  i === editing.highlight ? "bg-indigo-50 text-indigo-900" : "hover:bg-zinc-50"
                }`}
              >
                <span className="font-semibold">{c.code}</span>
                <span className="text-[10px] text-zinc-400">
                  {c.category === "OFF"
                    ? "libur"
                    : `${c.hours}j${c.startTime ? ` · ${c.startTime}–${c.endTime}` : ""}`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs leading-relaxed text-zinc-400">
        <b className="text-zinc-500">Tips:</b> klik sel lalu ketik — <b>angka jam</b> (mis. 4, 6, 8) untuk melihat semua
        shift dengan durasi itu, atau langsung <b>kode shift</b>. Ketik <b>0</b> / <b>off</b> untuk libur, kosongkan
        untuk menghapus. <b>Enter</b> = pindah ke bawah, <b>Tab</b> = ke kanan, <b>panah</b> = pindah sel,{" "}
        <b>Esc</b> = batal. Tombol <b>⚡ auto</b> di tiap minggu mengisi jadwal otomatis (menimpa isi minggu itu).
      </p>
    </div>
  );
}
