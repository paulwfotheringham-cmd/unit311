"use client";

import { FormEvent, useState } from "react";

import {
  marketingBtnSubmit,
  marketingInput,
  marketingInputLabel,
} from "@/lib/marketing-ui";

type ContactFormProps = {
  variant?: "default" | "marketing";
  embedded?: boolean;
};

export default function ContactForm({ variant = "default", embedded = false }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMarketing = variant === "marketing";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.get("firstName"),
          surname: formData.get("surname"),
          organisation: formData.get("organisation"),
          role: formData.get("role"),
          email: formData.get("email"),
          subject: formData.get("subject"),
          message: formData.get("message"),
        }),
      });

      const text = await response.text();
      let data: { error?: string; ok?: boolean } = {};
      if (text) {
        try {
          data = JSON.parse(text) as { error?: string; ok?: boolean };
        } catch {
          throw new Error(
            response.ok
              ? "Invalid server response."
              : `Request failed (${response.status}). Please try again.`,
          );
        }
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send enquiry");
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't send your enquiry right now. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const cardClass = isMarketing
    ? embedded
      ? ""
      : "rounded-xl bg-white px-5 py-6 shadow-[0_4px_24px_rgba(11,45,99,0.12)] sm:px-8 sm:py-8"
    : "rounded-2xl border border-border bg-surface p-6 sm:p-8";

  const labelClass = isMarketing ? marketingInputLabel : "mb-1.5 block text-sm font-medium text-foreground";

  const fieldClass = isMarketing
    ? marketingInput
    : "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60";

  const textareaClass = `${fieldClass} resize-none`;

  const buttonClass = isMarketing
    ? marketingBtnSubmit
    : "inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60";

  if (submitted) {
    return (
      <div className={cardClass}>
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-5 py-8 text-center">
          <p className={`text-lg font-semibold ${isMarketing ? "text-emerald-100" : "text-foreground"}`}>
            Thank you for reaching out
          </p>
          <p className={`mt-2 text-sm ${isMarketing ? "text-emerald-100/85" : "text-muted"}`}>
            Thank you for your email. We&apos;ve sent a confirmation to your inbox and will get back to you as soon as
            possible.
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
            <label htmlFor="firstName" className={labelClass}>
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              disabled={submitting}
              className={fieldClass}
              placeholder="First name"
              autoComplete="given-name"
            />
          </div>
          <div>
            <label htmlFor="surname" className={labelClass}>
              Surname
            </label>
            <input
              id="surname"
              name="surname"
              type="text"
              required
              disabled={submitting}
              className={fieldClass}
              placeholder="Surname"
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="organisation" className={labelClass}>
              Organisation
            </label>
            <input
              id="organisation"
              name="organisation"
              type="text"
              required
              disabled={submitting}
              className={fieldClass}
              placeholder="Organisation name"
              autoComplete="organization"
            />
          </div>
          <div>
            <label htmlFor="role" className={labelClass}>
              Role
            </label>
            <input
              id="role"
              name="role"
              type="text"
              disabled={submitting}
              className={fieldClass}
              placeholder="Your role"
              autoComplete="organization-title"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            disabled={submitting}
            className={fieldClass}
            placeholder="youremail@company.com"
            autoComplete="email"
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
            disabled={submitting}
            className={fieldClass}
            placeholder="What is your enquiry about?"
          />
        </div>

        <div>
          <label htmlFor="message" className={labelClass}>
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            disabled={submitting}
            className={textareaClass}
            placeholder="How can we help?"
          />
        </div>

        {error ? (
          <p className={`text-sm ${isMarketing ? "text-red-300" : "text-red-400"}`} role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className={buttonClass} disabled={submitting}>
          {submitting ? "Sending..." : "Send enquiry"}
        </button>
      </form>
    </div>
  );
}
