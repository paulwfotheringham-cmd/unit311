"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CreditCard } from "lucide-react";

import { PAYMENT_AMOUNT, PAYMENT_PLAN } from "@/lib/payment-data";

import { AmountBanner, PaymentField, PaymentPageShell, PaymentPanel } from "./payment-ui";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error(`Request failed (${response.status}).`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      response.ok
        ? "Invalid server response."
        : text.slice(0, 180) || `Request failed (${response.status}).`,
    );
  }
}

export default function PaymentCardPageContent() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const cardName = String(formData.get("cardName") || "").trim();
    const cardNumber = String(formData.get("cardNumber") || "").trim();

    try {
      const response = await fetch("/api/payment/card/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardName, cardNumber }),
      });

      const data = await readApiJson<{ error?: string; redirectPath?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Payment verification failed.");
      }

      setVerified(true);
      router.push(data.redirectPath ?? "/questions");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Payment verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PaymentPageShell
      title="Pay by card"
      description={`Enter your card details to complete your ${PAYMENT_PLAN} subscription payment.`}
      backHref="/payment"
    >
      <PaymentPanel>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563eb]/20 text-[#93c5fd]">
            <CreditCard className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Card payment</h2>
            <p className="text-sm text-white/55">Card payments coming soon (placeholder)</p>
          </div>
        </div>

        <div className="mt-6">
          <AmountBanner />
        </div>

        {verified ? (
          <p className="mt-6 rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 px-4 py-3 text-sm text-[#a7f3d0]">
            Payment verified. Redirecting to onboarding…
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <PaymentField id="cardName" label="Name on card" placeholder="Full name" required />
            <PaymentField
              id="cardNumber"
              label="Card number"
              placeholder="4242 4242 4242 4242"
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <PaymentField id="expiry" label="Expiry" placeholder="MM / YY" required />
              <PaymentField id="cvc" label="CVC" placeholder="123" required />
            </div>
            {error ? (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-white text-sm font-semibold text-[#0b2d63] transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Verifying…" : `Pay ${PAYMENT_AMOUNT} now`}
            </button>
          </form>
        )}
      </PaymentPanel>
    </PaymentPageShell>
  );
}
