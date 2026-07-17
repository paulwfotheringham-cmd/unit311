"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  BOOK_THANK_YOU_GENERAL_ITEMS,
  BOOK_THANK_YOU_MODULE_ITEMS,
  createEmptyBookThankYouSelections,
  type BookThankYouSelections,
} from "@/lib/book-thank-you-data";
import { CheckCircle2, Loader2 } from "lucide-react";

type BookThankYouPanelProps = {
  sessionWhen: string;
  confirmationEmail: string;
  meetingLink?: string;
  onSubmit?: (selections: BookThankYouSelections) => Promise<void> | void;
  submitLabel?: string;
  showTestNotice?: boolean;
  submittedMessage?: string;
};

function FocusCheckbox({
  id,
  label,
  checked,
  onChange,
  labelClassName = "text-sm leading-snug text-[#1a2b4a]/85",
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelClassName?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-white/40"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#94a3b8] text-[#2563eb] focus:ring-[#2563eb]"
      />
      <span className={labelClassName}>{label}</span>
    </label>
  );
}

export default function BookThankYouPanel({
  sessionWhen,
  confirmationEmail,
  meetingLink,
  onSubmit,
  submitLabel = "Submit",
  showTestNotice = false,
  submittedMessage = "Thank you — your focus areas have been saved and shared with our team.",
}: BookThankYouPanelProps) {
  const [selections, setSelections] = useState(createEmptyBookThankYouSelections);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moduleColumns = useMemo(() => {
    const midpoint = Math.ceil(BOOK_THANK_YOU_MODULE_ITEMS.length / 2);
    return {
      left: BOOK_THANK_YOU_MODULE_ITEMS.slice(0, midpoint),
      right: BOOK_THANK_YOU_MODULE_ITEMS.slice(midpoint),
    };
  }, []);

  async function handleSubmit() {
    if (!onSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(selections);
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit selections.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full rounded-2xl border border-white/40 bg-white/95 p-6 text-center shadow-[0_16px_48px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:p-8 lg:p-10">
      {showTestNotice ? (
        <p className="mb-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          Test page — add <span className="font-mono">?bookingId=&lt;uuid&gt;</span> to run the live
          PDF + CRM flow. Without it, submit is preview-only.
        </p>
      ) : null}

      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
      <h2 className="mt-4 text-2xl font-semibold text-[#1a2b4a] sm:text-[1.65rem]">
        Thank you for booking a meeting.
      </h2>

      <div className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-[#1a2b4a]/75">
        <p>An email has been sent with the details and the link to join the session.</p>
      </div>

      <div className="mx-auto mt-6 max-w-2xl space-y-2 text-sm text-[#1a2b4a]/70">
        <p>
          Your session: <span className="font-medium text-[#1a2b4a]">{sessionWhen}</span>
        </p>
        <p>
          Confirmation sent to{" "}
          <span className="font-medium text-[#1a2b4a]">{confirmationEmail}</span>.
        </p>
        {meetingLink ? (
          <p>
            Link to meeting:{" "}
            <a
              href={meetingLink}
              className="font-medium text-[#2563eb] underline-offset-2 hover:underline"
            >
              Join your session
            </a>
          </p>
        ) : (
          <p className="text-[#1a2b4a]/55">Link to meeting</p>
        )}
        <p>
          For any questions please email{" "}
          <a
            href="mailto:info@unit311central.com"
            className="font-medium text-[#2563eb] underline-offset-2 hover:underline"
          >
            info@unit311central.com
          </a>
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-5xl text-left">
        <div className="overflow-x-auto text-center">
          <p className="whitespace-nowrap text-sm text-[#1a2b4a]/75">
            In order to have a productive session, please select the areas and modules you&apos;d most
            like to focus on
          </p>
        </div>
        <p className="mt-3 text-center text-sm font-bold text-[#0b2d63]">
          If you don&apos;t have time to do this now, don&apos;t worry, we&apos;ll chat on the call!
        </p>

        <div className="mt-5 rounded-2xl border border-[#dbe4f0] bg-[#eef3f8] p-3 sm:p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-sky-200/80 bg-gradient-to-b from-sky-50 to-sky-100/70 p-4 sm:p-5">
              <h3 className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-sky-800">
                General
              </h3>
              <div className="mt-4 space-y-1">
                {BOOK_THANK_YOU_GENERAL_ITEMS.map((item, index) => (
                  <FocusCheckbox
                    key={item}
                    id={`general-${index}`}
                    label={item}
                    checked={selections.general[item] ?? false}
                    onChange={(checked) =>
                      setSelections((current) => ({
                        ...current,
                        general: { ...current.general, [item]: checked },
                      }))
                    }
                  />
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-violet-200/80 bg-gradient-to-b from-violet-50 to-indigo-100/60 p-4 sm:p-5">
              <h3 className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-violet-900">
                Modules
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  {moduleColumns.left.map((item, index) => (
                    <FocusCheckbox
                      key={item}
                      id={`module-left-${index}`}
                      label={item}
                      labelClassName="text-xs leading-snug text-[#1a2b4a]/85"
                      checked={selections.modules[item] ?? false}
                      onChange={(checked) =>
                        setSelections((current) => ({
                          ...current,
                          modules: { ...current.modules, [item]: checked },
                        }))
                      }
                    />
                  ))}
                </div>
                <div className="space-y-1">
                  {moduleColumns.right.map((item, index) => (
                    <FocusCheckbox
                      key={item}
                      id={`module-right-${index}`}
                      label={item}
                      labelClassName="text-xs leading-snug text-[#1a2b4a]/85"
                      checked={selections.modules[item] ?? false}
                      onChange={(checked) =>
                        setSelections((current) => ({
                          ...current,
                          modules: { ...current.modules, [item]: checked },
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-[#1a2b4a]/75">
        <p>
          You can also have a look prior in our{" "}
          <Link href="/faq" className="font-medium text-[#2563eb] underline-offset-2 hover:underline">
            FAQ section
          </Link>{" "}
          on the website.
        </p>
      </div>

      {onSubmit ? (
        <div className="mx-auto mt-8 max-w-md">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || submitted}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#2563eb] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : submitted ? (
              "Submitted"
            ) : (
              submitLabel
            )}
          </button>
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
          {submitted ? (
            <p className="mt-3 text-sm text-emerald-700">{submittedMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
