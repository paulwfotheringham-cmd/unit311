export const BOOK_SUBMITTED_STORAGE_KEY = "unit311:book-submitted";
export const BOOK_CONFIRMATION_STORAGE_KEY = "unit311:book-confirmation";
export const BOOK_SUBMITTED_EVENT = "unit311:book-submitted";

export type StoredBookConfirmation = {
  bookingId: string;
  sessionWhen: string;
  confirmationEmail: string;
  meetingLink: string;
};

export function markBookFormSubmitted(confirmation?: StoredBookConfirmation) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BOOK_SUBMITTED_STORAGE_KEY, "1");
  if (confirmation) {
    sessionStorage.setItem(BOOK_CONFIRMATION_STORAGE_KEY, JSON.stringify(confirmation));
  }
  window.dispatchEvent(new Event(BOOK_SUBMITTED_EVENT));
}

export function isBookFormSubmitted() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(BOOK_SUBMITTED_STORAGE_KEY) === "1";
}

export function readStoredBookConfirmation(): StoredBookConfirmation | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(BOOK_CONFIRMATION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredBookConfirmation;
    if (!parsed.bookingId || !parsed.sessionWhen || !parsed.confirmationEmail) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearBookFormSubmitted() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(BOOK_SUBMITTED_STORAGE_KEY);
  sessionStorage.removeItem(BOOK_CONFIRMATION_STORAGE_KEY);
}
