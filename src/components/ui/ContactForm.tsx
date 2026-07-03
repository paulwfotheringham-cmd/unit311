"use client";

import { FormEvent, useState } from "react";
import { CONTACT } from "@/lib/site";

type ContactFormProps = {
  variant?: "default" | "marketing";
};

export default function ContactForm({ variant = "default" }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const isMarketing = variant === "marketing";

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  const cardClass = isMarketing
    ? "rounded-xl bg-white px-5 py-6 shadow-[0_4px_24px_rgba(11,45,99,0.12)] sm:px-8 sm:py-8"
    : "rounded-2xl border border-border bg-surface p-6 sm:p-8";

  const labelClass = isMarketing
    ? "mb-1.5 block text-sm font-medium text-[#1a2b4a]"
    : "mb-1.5 block text-sm font-medium text-foreground";

  const fieldClass = isMarketing
    ? "w-full rounded-lg border border-[#d7e3f4] bg-white px-4 py-2.5 text-sm text-[#1a2b4a] placeholder:text-[#1a2b4a]/45 focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
    : "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

  const textareaClass = `${fieldClass} resize-none`;

  const buttonClass = isMarketing
    ? "inline-flex items-center justify-center rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_32px_rgba(37,99,235,0.35)] transition-colors hover:bg-[#1d4ed8]"
    : "inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover";

  if (submitted) {
    return (
      <div className={cardClass}>
        <div className="text-center">
          <p className={`text-lg font-semibold ${isMarketing ? "text-[#1a2b4a]" : "text-foreground"}`}>
            Thank you for reaching out
          </p>
          <p className={`mt-2 text-sm ${isMarketing ? "text-[#1a2b4a]/70" : "text-muted"}`}>
            We&apos;ll review your request and respond within one business day.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={labelClass}>
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className={fieldClass}
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="company" className={labelClass}>
              Company
            </label>
            <input
              id="company"
              name="company"
              type="text"
              className={fieldClass}
              placeholder="Company name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={fieldClass}
            placeholder={CONTACT.email}
          />
        </div>

        <div>
          <label htmlFor="subject" className={labelClass}>
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            className={fieldClass}
            placeholder="What is your enquiry about?"
          />
        </div>

        <div>
          <label htmlFor="message" className={labelClass}>
            Project details
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            className={textareaClass}
            placeholder="Site location, timeline, deliverables..."
          />
        </div>

        <button type="submit" className={buttonClass}>
          Send enquiry
        </button>
      </form>
    </div>
  );
}
