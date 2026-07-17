"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import MarketingPageShell from "@/components/layout/MarketingPageShell";
import type { CrmInviteSignupPrefill } from "@/lib/crm-invite-signup-prefill";
import {
  marketingBtnSubmit,
  marketingEyebrow,
  marketingFadeIn,
  marketingFormShell,
  marketingInput,
  marketingInputLabel,
  marketingLegalLink,
  marketingPageIntro,
  marketingPageTitle,
  MARKETING_CONTENT_CLASS,
} from "@/lib/marketing-ui";
import { validatePlatformSignupPasswordConfirmation } from "@/lib/platform-password-validation";

export type { CrmInviteSignupPrefill } from "@/lib/crm-invite-signup-prefill";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 120) || "Unexpected server response");
  }
}

function PasswordInput({
  id,
  name,
  label,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
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
          minLength={6}
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

function ReadOnlyField({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={marketingInputLabel}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value || "—"}
        readOnly
        tabIndex={-1}
        className={`${marketingInput} cursor-default border-white/10 bg-white/[0.04] text-white/85`}
      />
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
          Address
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
          Address line 2 (optional)
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
            Postcode
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

type CrmInviteSignupPageProps = {
  prefill: CrmInviteSignupPrefill;
  inviteToken: string;
};

export default function CrmInviteSignupPage({ prefill, inviteToken }: CrmInviteSignupPageProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingSameAsCompany, setBillingSameAsCompany] = useState(true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const acceptedTerms = formData.get("acceptedTerms") === "on";
    const phone = String(formData.get("phone") || "").trim() || prefill.phone;
    const accountsPayableEmail = String(formData.get("accountsPayableEmail") || "").trim();

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

    const passwordError = validatePlatformSignupPasswordConfirmation(password, confirmPassword);
    if (passwordError) {
      setError(passwordError);
      setBusy(false);
      return;
    }

    if (!acceptedTerms) {
      setError("You must accept the Terms & Conditions and Privacy Policy.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/crm-invite-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: inviteToken,
          password,
          confirmPassword,
          acceptedTerms: true,
          billingProfile: {
            firstName: prefill.firstName,
            surname: prefill.surname,
            companyName: prefill.organisation,
            role: prefill.role,
            email: prefill.email,
            phone,
            accountsPayableEmail,
            companyAddress,
            billingSameAsCompany,
            billingAddress,
          },
        }),
      });

      const data = await readApiJson<{ error?: string; email?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to complete sign-up.");
      }

      const email = data.email ?? prefill.email;
      router.push(`/signup/check-email?email=${encodeURIComponent(email)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to complete sign-up.");
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
          <h1 className={`mt-4 ${marketingPageTitle}`}>Complete your signup</h1>
          <p className={`mx-auto mt-3 max-w-xl ${marketingPageIntro}`}>
            We&apos;ve filled in details from your Intro &amp; Demo Session. Add your billing
            profile and create a password to continue.
          </p>
        </div>

        <div className={marketingFormShell}>
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#93c5fd]">
                Your details
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <ReadOnlyField id="firstName" label="First name" value={prefill.firstName} />
                <ReadOnlyField id="surname" label="Surname" value={prefill.surname} />
              </div>
              <ReadOnlyField id="organisation" label="Organisation" value={prefill.organisation} />
              <ReadOnlyField id="role" label="Role" value={prefill.role} />
              <ReadOnlyField id="email" label="Email address" value={prefill.email} />
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#93c5fd]">
                Contact &amp; billing
              </p>
              <div>
                <label htmlFor="phone" className={marketingInputLabel}>
                  Contact telephone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  defaultValue={prefill.phone}
                  className={marketingInput}
                />
              </div>
              <div>
                <label htmlFor="accountsPayableEmail" className={marketingInputLabel}>
                  Accounts Payable email
                </label>
                <input
                  id="accountsPayableEmail"
                  name="accountsPayableEmail"
                  type="email"
                  autoComplete="email"
                  defaultValue={prefill.email}
                  className={marketingInput}
                  placeholder="accounts@company.com"
                />
                <p className="mt-1.5 text-xs text-white/40">
                  Used as the default email for invoices. Defaults to your primary email if left
                  blank.
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-sm font-medium text-white/80">Company address</p>
                <AddressFields prefix="company" />
              </div>
              <div className="space-y-4">
                <p className="text-sm font-medium text-white/80">Billing address</p>
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
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#93c5fd]">
                Create your password
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <PasswordInput
                  id="password"
                  name="password"
                  label="Password"
                  hint="Minimum 6 characters, including at least one special character."
                />
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm password"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                name="acceptedTerms"
                required
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-[#2563eb] focus:ring-[#2563eb]"
              />
              <span>
                I accept the{" "}
                <Link
                  href="/termsandconditions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={marketingLegalLink}
                >
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacypolicy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={marketingLegalLink}
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {error ? (
              <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={busy} className={marketingBtnSubmit}>
              {busy ? "Creating account…" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </MarketingPageShell>
  );
}
