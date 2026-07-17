"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import MarketingPageShell from "@/components/layout/MarketingPageShell";
import {
  marketingBtnSubmit,
  marketingCardLarge,
  marketingEyebrow,
  marketingFadeIn,
  marketingFormShell,
  marketingInput,
  marketingInputLabel,
  marketingLegalLink,
  marketingPageTitle,
  MARKETING_CONTENT_CLASS,
} from "@/lib/marketing-ui";
import { validatePlatformSignupPasswordConfirmation } from "@/lib/platform-password-validation";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 120) || "Unexpected server response");
  }
}

function FormSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-white/10 pb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#93c5fd]">
      {children}
    </h2>
  );
}

function PasswordInput({
  id,
  name,
  label,
  hint,
  minLength = 6,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className={marketingInputLabel}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={minLength}
          className={`${marketingInput} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-white/45 transition-colors hover:text-white/80"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint ? <p className="mt-1.5 text-xs text-white/40">{hint}</p> : null}
    </div>
  );
}

function AddressFields({
  prefix,
  disabled = false,
}: {
  prefix: "company" | "billing";
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${prefix}AddressLine1`} className={marketingInputLabel}>
          Address 1
        </label>
        <input
          id={`${prefix}AddressLine1`}
          name={`${prefix}AddressLine1`}
          type="text"
          autoComplete={prefix === "company" ? "address-line1" : "billing address-line1"}
          required={!disabled}
          disabled={disabled}
          className={marketingInput}
        />
      </div>

      <div>
        <label htmlFor={`${prefix}AddressLine2`} className={marketingInputLabel}>
          Address 2
        </label>
        <input
          id={`${prefix}AddressLine2`}
          name={`${prefix}AddressLine2`}
          type="text"
          autoComplete={prefix === "company" ? "address-line2" : "billing address-line2"}
          disabled={disabled}
          className={marketingInput}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${prefix}City`} className={marketingInputLabel}>
            City
          </label>
          <input
            id={`${prefix}City`}
            name={`${prefix}City`}
            type="text"
            autoComplete={prefix === "company" ? "address-level2" : "billing address-level2"}
            required={!disabled}
            disabled={disabled}
            className={marketingInput}
          />
        </div>

        <div>
          <label htmlFor={`${prefix}Postcode`} className={marketingInputLabel}>
            ZIP or postcode
          </label>
          <input
            id={`${prefix}Postcode`}
            name={`${prefix}Postcode`}
            type="text"
            autoComplete={prefix === "company" ? "postal-code" : "billing postal-code"}
            required={!disabled}
            disabled={disabled}
            className={marketingInput}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${prefix}Country`} className={marketingInputLabel}>
          Country
        </label>
        <input
          id={`${prefix}Country`}
          name={`${prefix}Country`}
          type="text"
          autoComplete={prefix === "company" ? "country-name" : "billing country-name"}
          required={!disabled}
          disabled={disabled}
          className={marketingInput}
        />
      </div>
    </div>
  );
}

export default function Unit311SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [billingSameAsCompany, setBillingSameAsCompany] = useState(true);
  const notice = searchParams.get("notice");
  const verificationError = searchParams.get("error");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const firstName = String(formData.get("firstName") || "").trim();
    const surname = String(formData.get("surname") || "").trim();
    const companyName = String(formData.get("companyName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const jobTitle = String(formData.get("jobTitle") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const phone = String(formData.get("phone") || "").trim();
    const invoiceEmail = String(formData.get("accountsPayableEmail") || "").trim();
    const acceptedTerms = formData.get("acceptedTerms") === "on";

    const passwordError = validatePlatformSignupPasswordConfirmation(password, confirmPassword);
    if (passwordError) {
      setError(passwordError);
      setBusy(false);
      return;
    }

    if (!acceptedTerms) {
      setError("You must agree to the Terms and Conditions.");
      setBusy(false);
      return;
    }

    const companyAddress = {
      line1: String(formData.get("companyAddressLine1") || "").trim(),
      line2: String(formData.get("companyAddressLine2") || "").trim(),
      city: String(formData.get("companyCity") || "").trim(),
      country: String(formData.get("companyCountry") || "").trim(),
      postcode: String(formData.get("companyPostcode") || "").trim(),
    };

    const billingAddress = billingSameAsCompany
      ? companyAddress
      : {
          line1: String(formData.get("billingAddressLine1") || "").trim(),
          line2: String(formData.get("billingAddressLine2") || "").trim(),
          city: String(formData.get("billingCity") || "").trim(),
          country: String(formData.get("billingCountry") || "").trim(),
          postcode: String(formData.get("billingPostcode") || "").trim(),
        };

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          surname,
          companyName,
          email,
          jobTitle,
          password,
          confirmPassword,
          phone,
          invoiceEmail,
          accountsPayableEmail: invoiceEmail,
          companyAddress,
          billingSameAsCompany,
          billingAddress,
          acceptedTerms,
        }),
      });

      const data = await readApiJson<{ error?: string; email?: string; requiresEmailVerification?: boolean }>(
        response,
      );
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to complete sign-up.");
      }

      if (data.requiresEmailVerification) {
        setVerificationEmail(data.email ?? email);
        return;
      }

      router.push("/payment");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to complete sign-up.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingPageShell
      contentClassName={`${MARKETING_CONTENT_CLASS} flex flex-col items-center`}
    >
      <div className={`w-full max-w-2xl space-y-8 ${marketingFadeIn}`}>
        <div className="text-center">
          <p className={marketingEyebrow}>Unit311 Central</p>
          <h1 className={`mt-4 ${marketingPageTitle}`}>Create your workspace</h1>
          {process.env.NODE_ENV === "development" ? (
            <p className="mt-2 text-xs leading-relaxed text-emerald-300/80">
              Development mode: you can sign up repeatedly with the same email. Each signup creates a
              new test customer and sends a verification email to that address.
            </p>
          ) : null}
        </div>

        {verificationEmail ? (
          <div className={`${marketingCardLarge} border-emerald-400/25 bg-emerald-500/10 px-5 py-5 text-center`}>
            <p className="text-sm font-semibold text-emerald-100">Check your email</p>
            <p className="mt-2 text-sm leading-relaxed text-emerald-100/85">
              We sent a verification link to <strong>{verificationEmail}</strong>. Click it to continue to
              payment setup.
            </p>
          </div>
        ) : notice === "verify-email" ? (
          <div className={`${marketingCardLarge} border-amber-400/25 bg-amber-500/10 px-5 py-5 text-center`}>
            <p className="text-sm font-semibold text-amber-100">Verify your email first</p>
            <p className="mt-2 text-sm leading-relaxed text-amber-100/85">
              Please verify your email before continuing to payment.
            </p>
          </div>
        ) : verificationError ? (
          <div className={`${marketingCardLarge} border-red-400/25 bg-red-500/10 px-5 py-5 text-center`}>
            <p className="text-sm font-semibold text-red-100">Verification link invalid</p>
            <p className="mt-2 text-sm leading-relaxed text-red-100/85">
              That verification link is invalid or has expired. Create your account again or contact support.
            </p>
          </div>
        ) : null}

        {!verificationEmail ? (
          <div className={marketingFormShell}>
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
              <div>
                <label htmlFor="companyName" className={marketingInputLabel}>
                  Company name
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  autoComplete="organization"
                  required
                  className={marketingInput}
                  placeholder="Your company name"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className={marketingInputLabel}>
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    className={marketingInput}
                  />
                </div>

                <div>
                  <label htmlFor="surname" className={marketingInputLabel}>
                    Surname
                  </label>
                  <input
                    id="surname"
                    name="surname"
                    type="text"
                    autoComplete="family-name"
                    required
                    className={marketingInput}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className={marketingInputLabel}>
                  Primary email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={marketingInput}
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label htmlFor="jobTitle" className={marketingInputLabel}>
                  Job title
                </label>
                <input
                  id="jobTitle"
                  name="jobTitle"
                  type="text"
                  autoComplete="organization-title"
                  required
                  className={marketingInput}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <PasswordInput
                  id="password"
                  name="password"
                  label="Enter password"
                  hint="Minimum 6 characters, including at least one special character."
                />

                <PasswordInput id="confirmPassword" name="confirmPassword" label="Re-enter password" />
              </div>

              <div className="space-y-4">
                <FormSectionTitle>Company address</FormSectionTitle>
                <AddressFields prefix="company" />
              </div>

              <div>
                <label htmlFor="phone" className={marketingInputLabel}>
                  Contact telephone number (optional)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className={marketingInput}
                />
              </div>

              <div>
                <label htmlFor="accountsPayableEmail" className={marketingInputLabel}>
                  Accounts Payable email (optional)
                </label>
                <input
                  id="accountsPayableEmail"
                  name="accountsPayableEmail"
                  type="email"
                  autoComplete="email"
                  className={marketingInput}
                  placeholder="accounts@company.com"
                />
              </div>

              <div className="space-y-4">
                <FormSectionTitle>Billing address</FormSectionTitle>
                <label className="flex items-start gap-3 text-sm text-white/80">
                  <input
                    type="checkbox"
                    name="billingSameAsCompany"
                    checked={billingSameAsCompany}
                    onChange={(event) => setBillingSameAsCompany(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-[#2563eb] focus:ring-[#2563eb]"
                  />
                  <span>Same as company address</span>
                </label>
                {!billingSameAsCompany ? <AddressFields prefix="billing" /> : null}
              </div>

              <label className="flex items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  name="acceptedTerms"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-[#2563eb] focus:ring-[#2563eb]"
                />
                <span>
                  I agree to the{" "}
                  <Link
                    href="/termsandconditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={marketingLegalLink}
                  >
                    Terms and Conditions
                  </Link>
                </span>
              </label>

              {error ? (
                <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              ) : null}

              <button type="submit" disabled={busy} className={marketingBtnSubmit}>
                {busy ? "Creating account…" : "Create account"}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </MarketingPageShell>
  );
}
