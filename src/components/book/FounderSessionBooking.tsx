"use client";

import { useEffect, useMemo, useState } from "react";

import { FOUNDER_SESSION_TIMEZONE, formatLondonDateTime } from "@/lib/founder-booking/slots";
import { cn } from "@/lib/utils";
import { CalendarDays, CheckCircle2, Loader2, Video } from "lucide-react";

type SlotResponse = {
  dateKeys: string[];
  slots: Array<{
    startsAt: string;
    endsAt: string;
    label: string;
    dateKey: string;
  }>;
};

type BookingSuccess = {
  formattedWhen: string;
  booking: {
    videoLink: string;
  };
};

function formatDateKeyLabel(dateKey: string) {
  const utc = new Date(`${dateKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: FOUNDER_SESSION_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(utc);
}

export default function FounderSessionBooking() {
  const [dateKeys, setDateKeys] = useState<string[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotResponse["slots"]>([]);
  const [selectedStartsAt, setSelectedStartsAt] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<BookingSuccess | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSlots(dateKey?: string) {
      setLoadingSlots(true);
      setError(null);
      try {
        const params = dateKey ? `?date=${encodeURIComponent(dateKey)}` : "";
        const response = await fetch(`/api/book/founder-session${params}`, { cache: "no-store" });
        const data = (await response.json()) as SlotResponse & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to load available times");

        if (cancelled) return;
        setDateKeys(data.dateKeys);
        setSelectedDateKey(dateKey ?? data.dateKeys[0] ?? null);
        setSlots(data.slots);
        setSelectedStartsAt((current) =>
          current && data.slots.some((slot) => slot.startsAt === current) ? current : null,
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load available times");
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }

    void loadSlots(selectedDateKey ?? undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedDateKey]);

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.startsAt === selectedStartsAt) ?? null,
    [slots, selectedStartsAt],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedStartsAt) {
      setError("Please choose a time slot.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/book/founder-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          organization,
          email,
          startsAt: selectedStartsAt,
        }),
      });
      const data = (await response.json()) as BookingSuccess & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to book session");

      setSuccess(data);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to book session");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.08] p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
        <h2 className="mt-4 text-2xl font-semibold text-white">You&apos;re booked in</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Your complimentary founder session is confirmed for{" "}
          <span className="font-medium text-white">{success.formattedWhen}</span> (UK time).
        </p>
        <p className="mt-3 text-sm text-white/55">
          We&apos;ve emailed your confirmation and video link to{" "}
          <span className="font-medium text-white/80">{email}</span>. You&apos;ll receive a reminder the day before.
        </p>
        <a
          href={success.booking.videoLink}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
        >
          <Video className="h-4 w-4" />
          Open video session link
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sky-300">
          <CalendarDays className="h-4 w-4" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Choose a date</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {dateKeys.map((dateKey) => (
            <button
              key={dateKey}
              type="button"
              onClick={() => {
                setSelectedDateKey(dateKey);
                setSelectedStartsAt(null);
              }}
              className={cn(
                "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                selectedDateKey === dateKey
                  ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                  : "border-white/10 bg-black/15 text-white/70 hover:border-white/20 hover:text-white",
              )}
            >
              {formatDateKeyLabel(dateKey)}
            </button>
          ))}
        </div>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
          Available times (UK / London)
        </p>

        {loadingSlots ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading available slots…
          </div>
        ) : slots.length === 0 ? (
          <p className="mt-4 text-sm text-white/50">No open slots on this day. Please choose another date.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((slot) => (
              <button
                key={slot.startsAt}
                type="button"
                onClick={() => setSelectedStartsAt(slot.startsAt)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                  selectedStartsAt === slot.startsAt
                    ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                    : "border-white/10 bg-black/15 text-white/70 hover:border-white/20 hover:text-white",
                )}
              >
                {slot.label}
              </button>
            ))}
          </div>
        )}
      </section>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
          Your details
        </p>
        <p className="mt-2 text-sm text-white/55">
          30-minute complimentary founder session. We&apos;ll send confirmation and your video link by email.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/55">Full name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none ring-sky-400/30 focus:border-sky-400/40 focus:ring-2"
              placeholder="Your name"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/55">Organisation</span>
            <input
              required
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none ring-sky-400/30 focus:border-sky-400/40 focus:ring-2"
              placeholder="Company or venture name"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/55">Email address</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none ring-sky-400/30 focus:border-sky-400/40 focus:ring-2"
              placeholder="you@company.com"
            />
          </label>
        </div>

        {selectedSlot ? (
          <p className="mt-5 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
            Selected:{" "}
            <span className="font-medium text-white">
              {formatLondonDateTime(selectedSlot.startsAt)}
            </span>
          </p>
        ) : null}

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting || !selectedStartsAt || loadingSlots}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#2563eb] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Booking…
            </>
          ) : (
            "Confirm founder session"
          )}
        </button>
      </form>
    </div>
  );
}
