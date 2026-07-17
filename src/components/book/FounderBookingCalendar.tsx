"use client";

import { useEffect, useMemo, useState } from "react";

import { getFounderBookingMonthBounds } from "@/lib/founder-booking/slots";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type MonthYear = {
  year: number;
  month: number;
};

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addMonths({ year, month }: MonthYear, delta: number): MonthYear {
  const next = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
}

function listMonthsInRange(min: MonthYear, max: MonthYear) {
  const months: MonthYear[] = [];
  let current = min;
  while (compareMonthYear(current, max) <= 0) {
    months.push(current);
    current = addMonths(current, 1);
  }
  return months;
}

function formatMonthYearOption({ year, month }: MonthYear) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function monthYearKey({ year, month }: MonthYear) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function compareMonthYear(a: MonthYear, b: MonthYear) {
  return a.year === b.year ? a.month - b.month : a.year - b.year;
}

function monthYearFromDateKey(dateKey: string): MonthYear {
  const { year, month } = parseDateKey(dateKey);
  return { year, month };
}

function formatSelectedDateLabel(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function weekdayIndexForDateKey(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (weekday + 6) % 7;
}

function buildMonthCells({ year, month }: MonthYear) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingEmpty = weekdayIndexForDateKey(toDateKey(year, month, 1));
  const cells: Array<{ day: number; dateKey: string } | null> = [];

  for (let index = 0; index < leadingEmpty; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, dateKey: toDateKey(year, month, day) });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

type FounderBookingCalendarProps = {
  bookableDateKeys: string[];
  selectedDateKey: string | null;
  onSelectDateKey: (dateKey: string) => void;
};

export default function FounderBookingCalendar({
  bookableDateKeys,
  selectedDateKey,
  onSelectDateKey,
}: FounderBookingCalendarProps) {
  const bookableSet = useMemo(() => new Set(bookableDateKeys), [bookableDateKeys]);

  const bounds = useMemo(() => getFounderBookingMonthBounds(), []);

  const selectableMonths = useMemo(
    () => listMonthsInRange(bounds.min, bounds.max),
    [bounds.min, bounds.max],
  );

  const [visibleMonth, setVisibleMonth] = useState<MonthYear>(() => {
    if (selectedDateKey) return monthYearFromDateKey(selectedDateKey);
    if (bookableDateKeys[0]) return monthYearFromDateKey(bookableDateKeys[0]);
    return bounds.min;
  });

  useEffect(() => {
    if (!selectedDateKey || !bookableSet.has(selectedDateKey)) return;
    setVisibleMonth(monthYearFromDateKey(selectedDateKey));
  }, [selectedDateKey, bookableSet]);

  const displayMonth = visibleMonth;
  const cells = useMemo(() => buildMonthCells(displayMonth), [displayMonth]);

  function shiftMonth(delta: number) {
    setVisibleMonth((current) => {
      const next = new Date(Date.UTC(current.year, current.month - 1 + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
    });
  }

  function canShiftMonth(delta: number) {
    const next = addMonths(displayMonth, delta);
    return compareMonthYear(next, bounds.min) >= 0 && compareMonthYear(next, bounds.max) <= 0;
  }

  function handleMonthChange(value: string) {
    const [year, month] = value.split("-").map(Number);
    setVisibleMonth({ year, month });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canShiftMonth(-1)}
          onClick={() => shiftMonth(-1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-white/70 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center">
          <label className="flex w-full max-w-[240px] items-center gap-2">
            <span className="sr-only">Choose month</span>
            <select
              value={monthYearKey(displayMonth)}
              onChange={(event) => handleMonthChange(event.target.value)}
              aria-label="Choose month"
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white outline-none"
            >
              {selectableMonths.map((month) => (
                <option key={monthYearKey(month)} value={monthYearKey(month)} className="bg-[#07111f] text-white">
                  {formatMonthYearOption(month)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          aria-label="Next month"
          disabled={!canShiftMonth(1)}
          onClick={() => shiftMonth(1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-white/70 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35 sm:text-[11px]"
          >
            {label}
          </div>
        ))}

        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className="aspect-square" aria-hidden />;
          }

          const isBookable = bookableSet.has(cell.dateKey);
          const isSelected = selectedDateKey === cell.dateKey;
          const isWeekend = weekdayIndexForDateKey(cell.dateKey) >= 5;

          return (
            <button
              key={cell.dateKey}
              type="button"
              disabled={!isBookable}
              onClick={() => {
                onSelectDateKey(cell.dateKey);
                setVisibleMonth(monthYearFromDateKey(cell.dateKey));
              }}
              className={cn(
                "aspect-square rounded-xl text-sm font-medium transition-colors",
                isSelected
                  ? "border border-sky-400/40 bg-sky-500/20 text-sky-100"
                  : isBookable
                    ? "border border-white/10 bg-black/15 text-white hover:border-white/20 hover:bg-black/25"
                    : "cursor-not-allowed border border-transparent text-white/20",
                isWeekend && !isBookable && "text-white/15",
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {selectedDateKey ? (
        <p className="mt-4 text-sm text-white/70">
          Selected: <span className="font-medium text-white">{formatSelectedDateLabel(selectedDateKey)}</span>
        </p>
      ) : (
        <p className="mt-4 text-sm text-white/50">Choose an available weekday to see open times.</p>
      )}
    </div>
  );
}
