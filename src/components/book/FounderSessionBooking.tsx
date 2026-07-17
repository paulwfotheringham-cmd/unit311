"use client";



import { useEffect, useMemo, useState } from "react";



import BookThankYouPanel from "@/components/book/BookThankYouPanel";

import FounderBookingCalendar from "@/components/book/FounderBookingCalendar";

import type { BookThankYouSelections } from "@/lib/book-thank-you-data";

import {

  markBookFormSubmitted,

  isBookFormSubmitted,

  readStoredBookConfirmation,

  type StoredBookConfirmation,

} from "@/lib/book-submission-state";

import { formatLondonDateTime } from "@/lib/founder-booking/slots";

import {

  DEFAULT_FOUNDER_BOOKING_TIMEZONE,

  FOUNDER_BOOKING_TIMEZONES,

  formatDateTimeInTimezone,

  formatTimeInTimezone,

  getTimezoneAbbreviation,

} from "@/lib/founder-booking/timezones";

import { CalendarDays, Globe2, Loader2 } from "lucide-react";



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

  formattedWhenClient?: string;

  clientTimezoneLabel?: string;

  booking: {

    id: string;

    videoLink: string;

  };

};



type FounderSessionBookingProps = {

  onBookingSuccess?: () => void;

};



function buildSessionWhenLabel(success: BookingSuccess) {

  if (success.formattedWhenClient) {

    return `${success.formattedWhenClient} (${success.clientTimezoneLabel ?? "local time"})`;

  }

  return success.formattedWhen;

}



export default function FounderSessionBooking({ onBookingSuccess }: FounderSessionBookingProps) {

  const [dateKeys, setDateKeys] = useState<string[]>([]);

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const [clientTimezone, setClientTimezone] = useState(DEFAULT_FOUNDER_BOOKING_TIMEZONE);

  const [slots, setSlots] = useState<SlotResponse["slots"]>([]);

  const [selectedStartsAt, setSelectedStartsAt] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");

  const [surname, setSurname] = useState("");

  const [organization, setOrganization] = useState("");

  const [role, setRole] = useState("");

  const [email, setEmail] = useState("");

  const [loadingSlots, setLoadingSlots] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<BookingSuccess | null>(null);

  const [storedConfirmation, setStoredConfirmation] = useState<StoredBookConfirmation | null>(null);



  useEffect(() => {

    if (isBookFormSubmitted()) {

      setStoredConfirmation(readStoredBookConfirmation());

    }

  }, []);



  useEffect(() => {

    let cancelled = false;



    async function loadDateKeys() {

      setLoadingSlots(true);

      setError(null);

      try {

        const response = await fetch("/api/book/founder-session", { cache: "no-store" });

        const data = (await response.json()) as SlotResponse & { error?: string };

        if (!response.ok) throw new Error(data.error ?? "Failed to load available times");



        if (cancelled) return;

        setDateKeys(data.dateKeys);

        setSelectedDateKey((current) => current ?? data.dateKeys[0] ?? null);

      } catch (loadError) {

        if (!cancelled) {

          setError(loadError instanceof Error ? loadError.message : "Failed to load available times");

        }

      } finally {

        if (!cancelled) setLoadingSlots(false);

      }

    }



    void loadDateKeys();

    return () => {

      cancelled = true;

    };

  }, []);



  useEffect(() => {

    if (!selectedDateKey) return;



    const dateKey = selectedDateKey;

    let cancelled = false;



    async function loadSlots() {

      setLoadingSlots(true);

      setError(null);

      try {

        const response = await fetch(

          `/api/book/founder-session?date=${encodeURIComponent(dateKey)}`,

          { cache: "no-store" },

        );

        const data = (await response.json()) as SlotResponse & { error?: string };

        if (!response.ok) throw new Error(data.error ?? "Failed to load available times");



        if (cancelled) return;

        setDateKeys(data.dateKeys);

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



    void loadSlots();

    return () => {

      cancelled = true;

    };

  }, [selectedDateKey]);



  const selectedSlot = useMemo(

    () => slots.find((slot) => slot.startsAt === selectedStartsAt) ?? null,

    [slots, selectedStartsAt],

  );



  const clientTimezoneAbbrev = getTimezoneAbbreviation(clientTimezone);



  async function handleSubmit(event: React.FormEvent) {

    event.preventDefault();

    if (!selectedStartsAt) {

      setError("Please choose a time slot.");

      return;

    }



    setSubmitting(true);

    setError(null);

    const name = `${firstName.trim()} ${surname.trim()}`.trim();

    try {

      const response = await fetch("/api/book/founder-session", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          name,

          organization,

          role,

          email,

          startsAt: selectedStartsAt,

          clientTimezone,

        }),

      });

      const data = (await response.json()) as BookingSuccess & { error?: string };

      if (!response.ok) throw new Error(data.error ?? "Failed to book session");



      const confirmation: StoredBookConfirmation = {

        bookingId: data.booking.id,

        sessionWhen: buildSessionWhenLabel(data),

        confirmationEmail: email,

        meetingLink: data.booking.videoLink,

      };



      setSuccess(data);

      setStoredConfirmation(confirmation);

      markBookFormSubmitted(confirmation);

      onBookingSuccess?.();

    } catch (submitError) {

      setError(submitError instanceof Error ? submitError.message : "Failed to book session");

    } finally {

      setSubmitting(false);

    }

  }



  async function handleFocusSubmit(selections: BookThankYouSelections) {

    const bookingId = success?.booking.id ?? storedConfirmation?.bookingId;

    if (!bookingId) {

      throw new Error("Booking reference is missing. Please refresh and try again.");

    }



    const response = await fetch(`/api/book/founder-session/${encodeURIComponent(bookingId)}/focus`, {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ selections, email: storedConfirmation?.confirmationEmail ?? email }),

    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {

      throw new Error(data.error ?? "Failed to save focus selections");

    }

  }



  const thankYouProps = success

    ? {

        sessionWhen: buildSessionWhenLabel(success),

        confirmationEmail: email,

        meetingLink: success.booking.videoLink,

      }

    : storedConfirmation

      ? {

          sessionWhen: storedConfirmation.sessionWhen,

          confirmationEmail: storedConfirmation.confirmationEmail,

          meetingLink: storedConfirmation.meetingLink,

        }

      : null;



  if (thankYouProps) {

    return (

      <BookThankYouPanel

        sessionWhen={thankYouProps.sessionWhen}

        confirmationEmail={thankYouProps.confirmationEmail}

        meetingLink={thankYouProps.meetingLink}

        onSubmit={handleFocusSubmit}

      />

    );

  }



  return (

    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">

      <section className="rounded-2xl border border-white/15 bg-[#07111f]/88 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.35)] sm:p-6">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

          <div className="flex items-center gap-2 text-sky-300">

            <CalendarDays className="h-4 w-4 shrink-0" />

            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Choose a date</p>

          </div>



          <label className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80 sm:w-auto sm:min-w-[220px]">

            <Globe2 className="h-4 w-4 shrink-0 text-sky-300" />

            <span className="sr-only">Your timezone</span>

            <select

              value={clientTimezone}

              onChange={(event) => setClientTimezone(event.target.value)}

              className="w-full bg-transparent text-sm text-white outline-none"

            >

              {FOUNDER_BOOKING_TIMEZONES.map((timezone) => (

                <option key={timezone.id} value={timezone.id} className="bg-[#07111f] text-white">

                  {timezone.label}

                </option>

              ))}

            </select>

          </label>

        </div>



        <div className="mt-4">

          <FounderBookingCalendar

            bookableDateKeys={dateKeys}

            selectedDateKey={selectedDateKey}

            onSelectDateKey={(dateKey) => {

              setSelectedDateKey(dateKey);

              setSelectedStartsAt(null);

            }}

          />

        </div>



        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">

          Available times ({clientTimezoneAbbrev})

        </p>

        <p className="mt-1 text-xs text-white/45">

          Slots are held 9-6 GMT, Monday to Friday. Times below are shown in your selected timezone.

        </p>



        {loadingSlots ? (

          <div className="mt-4 flex items-center gap-2 text-sm text-white/50">

            <Loader2 className="h-4 w-4 animate-spin" />

            Loading available slots…

          </div>

        ) : slots.length === 0 ? (

          <p className="mt-4 text-sm text-white/50">No open slots on this day. Please choose another date.</p>

        ) : (

          <label className="mt-4 block">

            <span className="mb-1.5 block text-xs font-medium text-white/55">Choose a time</span>

            <select

              value={selectedStartsAt ?? ""}

              onChange={(event) => setSelectedStartsAt(event.target.value || null)}

              className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none ring-sky-400/30 focus:border-sky-400/40 focus:ring-2"

            >

              <option value="" className="bg-[#07111f] text-white/60">

                Select a time

              </option>

              {slots.map((slot) => (

                <option key={slot.startsAt} value={slot.startsAt} className="bg-[#07111f] text-white">

                  {formatTimeInTimezone(slot.startsAt, clientTimezone)}

                </option>

              ))}

            </select>

          </label>

        )}

      </section>



      <form

        onSubmit={(event) => void handleSubmit(event)}

        className="rounded-2xl border border-white/15 bg-[#07111f]/88 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.35)] sm:p-6"

      >

        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">

          Your details

        </p>

        <p className="mt-2 text-sm text-white/55">

          Free 30-minute intro and demo session. We&apos;ll send confirmation and your video link by email.

        </p>



        <div className="mt-5 space-y-4">

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <label className="block">

              <span className="mb-1.5 block text-xs font-medium text-white/55">First name</span>

              <input

                required

                value={firstName}

                onChange={(event) => setFirstName(event.target.value)}

                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none ring-sky-400/30 focus:border-sky-400/40 focus:ring-2"

                placeholder="First name"

                autoComplete="given-name"

              />

            </label>



            <label className="block">

              <span className="mb-1.5 block text-xs font-medium text-white/55">Surname</span>

              <input

                required

                value={surname}

                onChange={(event) => setSurname(event.target.value)}

                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none ring-sky-400/30 focus:border-sky-400/40 focus:ring-2"

                placeholder="Surname"

                autoComplete="family-name"

              />

            </label>

          </div>



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

            <span className="mb-1.5 block text-xs font-medium text-white/55">Role</span>

            <input

              required

              value={role}

              onChange={(event) => setRole(event.target.value)}

              className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none ring-sky-400/30 focus:border-sky-400/40 focus:ring-2"

              placeholder="e.g. CEO, Operations Director"

              autoComplete="organization-title"

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

          <div className="mt-5 space-y-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">

            <p>

              Your time:{" "}

              <span className="font-medium text-white">

                {formatDateTimeInTimezone(selectedSlot.startsAt, clientTimezone)}

              </span>

            </p>

            <p>

              GMT:{" "}

              <span className="font-medium text-white">

                {formatLondonDateTime(selectedSlot.startsAt)}

              </span>

            </p>

          </div>

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

            "Confirm session"

          )}

        </button>

      </form>

    </div>

  );

}


