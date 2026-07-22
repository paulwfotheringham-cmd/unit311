import {
  DEFAULT_FOUNDER_BOOKING_TIMEZONE,
  FOUNDER_BOOKING_TIMEZONES,
  getFounderBookingTimezone,
} from "@/lib/founder-booking/timezones";

export const CALENDAR_MEETING_DURATIONS_MINUTES = [15, 30, 45, 60, 90, 120] as const;

export type CalendarMeetingDurationMinutes =
  (typeof CALENDAR_MEETING_DURATIONS_MINUTES)[number];

export const CALENDAR_TIMEZONES = FOUNDER_BOOKING_TIMEZONES;
export const DEFAULT_CALENDAR_TIMEZONE = DEFAULT_FOUNDER_BOOKING_TIMEZONE;

export function getCalendarTimezone(id: string) {
  return getFounderBookingTimezone(id);
}

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

/**
 * Convert a wall-clock date + 24h time in an IANA timezone to a UTC ISO string.
 */
export function combineDateTimeInTimezone(
  dateValue: string,
  timeValue: string,
  timeZone: string,
): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (![year, month, day, hours, minutes].every((value) => Number.isFinite(value))) {
    throw new Error("Invalid date or time");
  }

  let utcMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getZonedParts(new Date(utcMs), timeZone);
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      0,
      0,
    );
    const desired = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
    utcMs += desired - asUtc;
  }

  return new Date(utcMs).toISOString();
}

export function addMinutesToIso(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

/** Convert 12h clock fields to HH:mm (24h). */
export function toTwentyFourHourTime(
  hour12: number,
  minute: number,
  meridiem: "AM" | "PM",
): string {
  const hour = ((hour12 % 12) + (meridiem === "PM" ? 12 : 0)) % 24;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hour)}:${pad(Math.min(Math.max(minute, 0), 59))}`;
}

/** Parse HH:mm into 12h clock fields. */
export function fromTwentyFourHourTime(timeValue: string): {
  hour12: number;
  minute: number;
  meridiem: "AM" | "PM";
} {
  const [rawHour, rawMinute] = timeValue.split(":").map(Number);
  const hour24 = Number.isFinite(rawHour) ? rawHour : 9;
  const minute = Number.isFinite(rawMinute) ? rawMinute : 0;
  const meridiem: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, minute, meridiem };
}

export function appendTimezoneToNotes(
  notes: string | null | undefined,
  timeZone: string,
): string | null {
  const base = (notes ?? "").replace(/\n?Timezone:\s*.+$/im, "").trim();
  const line = `Timezone: ${timeZone.trim()}`;
  return base ? `${base}\n${line}` : line;
}

export function extractTimezoneFromNotes(notes: string | null | undefined): string | null {
  const match = notes?.match(/Timezone:\s*([^\n]+)/i);
  return match?.[1]?.trim() || null;
}

export function stripTimezoneFromNotes(notes: string | null | undefined): string {
  return (notes ?? "").replace(/\n?Timezone:\s*.+$/im, "").trim();
}
