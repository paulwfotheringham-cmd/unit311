export const FOUNDER_SESSION_TIMEZONE = "Europe/London";
export const FOUNDER_SLOT_MINUTES = 30;
export const FOUNDER_DAY_START_HOUR = 9;
export const FOUNDER_DAY_LAST_SLOT_HOUR = 18;
/** @deprecated Use FOUNDER_DAY_LAST_SLOT_HOUR — kept for compatibility */
export const FOUNDER_DAY_END_HOUR = FOUNDER_DAY_LAST_SLOT_HOUR + 1;
export const FOUNDER_BOOKING_HORIZON_MONTHS = 6;

export type FounderSessionSlot = {
  startsAt: string;
  endsAt: string;
  label: string;
  dateKey: string;
};

type LondonParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getLondonParts(date: Date): LondonParts {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: FOUNDER_SESSION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
  };
}

export function londonDateKey(date: Date) {
  const parts = getLondonParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function londonLocalToUtcIso(dateKey: string, hour: number, minute: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  let guess = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const parts = getLondonParts(new Date(guess));
    if (
      parts.year === year &&
      parts.month === month &&
      parts.day === day &&
      parts.hour === hour &&
      parts.minute === minute
    ) {
      return new Date(guess).toISOString();
    }

    const targetMinutes = hour * 60 + minute;
    const actualMinutes = parts.hour * 60 + parts.minute;
    guess += (targetMinutes - actualMinutes) * 60_000;
  }

  return new Date(guess).toISOString();
}

export function formatLondonDateTime(iso: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: FOUNDER_SESSION_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  }).format(new Date(iso));
}

export function formatLondonTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: FOUNDER_SESSION_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function isWeekdayDateKey(dateKey: string) {
  const utc = londonLocalToUtcIso(dateKey, 12, 0);
  const weekday = new Intl.DateTimeFormat("en-GB", {
    timeZone: FOUNDER_SESSION_TIMEZONE,
    weekday: "short",
  }).format(new Date(utc));
  return weekday !== "Sat" && weekday !== "Sun";
}

export function getFounderBookingMonthBounds(from = new Date()) {
  const todayKey = londonDateKey(from);
  const parts = getLondonParts(from);
  const min = { year: parts.year, month: parts.month };
  const maxAnchor = new Date(Date.UTC(parts.year, parts.month - 1 + FOUNDER_BOOKING_HORIZON_MONTHS, 1));
  const max = { year: maxAnchor.getUTCFullYear(), month: maxAnchor.getUTCMonth() + 1 };
  const lastDayOfMaxMonth = new Date(Date.UTC(max.year, max.month, 0)).getUTCDate();
  const maxDateKey = `${max.year}-${String(max.month).padStart(2, "0")}-${String(lastDayOfMaxMonth).padStart(2, "0")}`;

  return { min, max, todayKey, maxDateKey };
}

export function listBookableDateKeys(from = new Date()) {
  const { todayKey, maxDateKey } = getFounderBookingMonthBounds(from);
  const keys: string[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);

  while (true) {
    const key = londonDateKey(cursor);
    if (key > maxDateKey) break;
    if (key >= todayKey && isWeekdayDateKey(key) && !keys.includes(key)) {
      keys.push(key);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}

export function buildSlotsForDateKey(dateKey: string): FounderSessionSlot[] {
  if (!isWeekdayDateKey(dateKey)) return [];

  const slots: FounderSessionSlot[] = [];
  for (
    let minutes = FOUNDER_DAY_START_HOUR * 60;
    minutes <= FOUNDER_DAY_LAST_SLOT_HOUR * 60;
    minutes += FOUNDER_SLOT_MINUTES
  ) {
    const wholeHour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const startsAt = londonLocalToUtcIso(dateKey, wholeHour, minute);
    const endsAt = new Date(
      new Date(startsAt).getTime() + FOUNDER_SLOT_MINUTES * 60_000,
    ).toISOString();

    if (new Date(startsAt) <= new Date()) continue;

    slots.push({
      startsAt,
      endsAt,
      dateKey,
      label: formatLondonTime(startsAt),
    });
  }

  return slots;
}

export function firstNameFromFullName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}
