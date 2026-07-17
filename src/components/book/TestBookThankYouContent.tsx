"use client";

import { useSearchParams } from "next/navigation";

import BookThankYouPanel from "@/components/book/BookThankYouPanel";
import type { BookThankYouSelections } from "@/lib/book-thank-you-data";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

export default function TestBookThankYouContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId")?.trim() ?? "";

  async function handleSubmit(selections: BookThankYouSelections) {
    if (!bookingId) {
      throw new Error(
        "Add ?bookingId=<uuid> to this URL to test the live PDF + CRM flow for a real booking.",
      );
    }

    const response = await fetch(
      `/api/book/founder-session/${encodeURIComponent(bookingId)}/focus`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections }),
      },
    );

    const data = await readApiJson<{ error?: string; pdfFileId?: string }>(response);
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to save focus selections.");
    }
  }

  return (
    <div className="mx-auto flex min-h-[min(72dvh,760px)] max-w-4xl items-center py-6">
      <BookThankYouPanel
        sessionWhen="Thursday, 30 July 2026 at 03:00 pm GMT"
        confirmationEmail="paul.w.fotheringham+smith@gmail.com"
        meetingLink="https://unit311central.com/executivecall/preview-session"
        showTestNotice
        onSubmit={handleSubmit}
        submitLabel={bookingId ? "Submit (live test)" : "Submit"}
        submittedMessage={
          bookingId
            ? "Thank you — focus areas saved, PDF generated, and linked to the meeting."
            : "Preview only — add ?bookingId= to test the live flow."
        }
      />
    </div>
  );
}
