"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import FounderSessionBooking from "@/components/book/FounderSessionBooking";
import {
  BOOK_SUBMITTED_EVENT,
  isBookFormSubmitted,
} from "@/lib/book-submission-state";

const BOOK_INTRO_BULLETS = [
  "Where your pain points are, and give an overview of the platform.",
  "Our team is available 9-6, Monday to Friday in GMT time.",
  "Chose a timeslot in your local timezone and we will convert it to GMT for us.",
  "We will then email a short overview of the call as a PDF after.",
  "From there you can decide if you want to progress — no obligations!",
] as const;

export default function BookPageContent() {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSubmitted(isBookFormSubmitted());

    function handleSubmitted() {
      setSubmitted(true);
    }

    window.addEventListener(BOOK_SUBMITTED_EVENT, handleSubmitted);
    return () => window.removeEventListener(BOOK_SUBMITTED_EVENT, handleSubmitted);
  }, []);

  return (
    <>
      {!submitted ? (
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Book a free intro and demo session
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm text-white sm:text-base">
            We&apos;d love to have a short call to better understand your requirements
          </p>
          <div className="mx-auto mt-8 flex justify-center">
            <ul className="w-fit max-w-3xl space-y-2.5 text-left text-sm text-white sm:text-base">
              {BOOK_INTRO_BULLETS.map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div
        className={`rounded-[28px] border border-white/15 bg-white/[0.1] shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-6 lg:rounded-[32px] lg:p-8 ${
          submitted
            ? "mx-auto mt-0 flex min-h-[min(72dvh,640px)] max-w-4xl items-center p-4 sm:min-h-[min(68dvh,720px)]"
            : "mt-10 p-4"
        }`}
      >
        <FounderSessionBooking onBookingSuccess={() => setSubmitted(true)} />
      </div>
    </>
  );
}
