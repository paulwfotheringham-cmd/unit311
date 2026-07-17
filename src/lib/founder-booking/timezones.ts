export type FounderBookingTimezone = {
  id: string;
  label: string;
  abbreviation: string;
};

export const FOUNDER_BOOKING_TIMEZONES: FounderBookingTimezone[] = [
  { id: "America/Los_Angeles", label: "Pacific Standard Time (PST)", abbreviation: "PST" },
  { id: "America/Denver", label: "Mountain Standard Time (MST)", abbreviation: "MST" },
  { id: "America/Chicago", label: "Central Standard Time (CST)", abbreviation: "CST" },
  { id: "America/New_York", label: "Eastern Standard Time (EST)", abbreviation: "EST" },
  { id: "Europe/London", label: "Greenwich Mean Time (GMT)", abbreviation: "GMT" },
  { id: "Europe/Paris", label: "Central European Time (CET)", abbreviation: "CET" },
  { id: "Europe/Bucharest", label: "Eastern European Time (EET)", abbreviation: "EET" },
  { id: "Asia/Dubai", label: "Gulf Standard Time (GST)", abbreviation: "GST" },
  { id: "Asia/Karachi", label: "Pakistan Standard Time (PKT)", abbreviation: "PKT" },
  { id: "Asia/Kolkata", label: "India Standard Time (IST)", abbreviation: "IST" },
  { id: "Asia/Bangkok", label: "Indochina Time (ICT)", abbreviation: "ICT" },
  { id: "Asia/Shanghai", label: "China Standard Time (CST)", abbreviation: "CST" },
  { id: "Asia/Tokyo", label: "Japan Standard Time (JST)", abbreviation: "JST" },
  { id: "Australia/Sydney", label: "Australian Eastern Standard Time (AEST)", abbreviation: "AEST" },
];

export const DEFAULT_FOUNDER_BOOKING_TIMEZONE = "Europe/London";

export function getFounderBookingTimezone(id: string) {
  return (
    FOUNDER_BOOKING_TIMEZONES.find((entry) => entry.id === id) ??
    FOUNDER_BOOKING_TIMEZONES.find((entry) => entry.id === DEFAULT_FOUNDER_BOOKING_TIMEZONE)!
  );
}

export function getTimezoneAbbreviation(timeZoneId: string) {
  return getFounderBookingTimezone(timeZoneId).abbreviation;
}

function formatClockTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatDateTimeInTimezone(
  iso: string,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
) {
  const dateTime = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  }).format(new Date(iso));

  return `${dateTime} ${getTimezoneAbbreviation(timeZone)}`;
}

export function formatTimeInTimezone(iso: string, timeZone: string) {
  return formatClockTime(iso, timeZone);
}
