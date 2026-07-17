export type TranscriptLine = {
  id: string;
  speaker: string;
  text: string;
  at: string;
};

export function parseTranscriptDraft(value: unknown): TranscriptLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const text = typeof row.text === "string" ? row.text.trim() : "";
      if (!text) return null;
      return {
        id: typeof row.id === "string" ? row.id : crypto.randomUUID(),
        speaker: typeof row.speaker === "string" ? row.speaker : "Speaker",
        text,
        at: typeof row.at === "string" ? row.at : new Date().toISOString(),
      };
    })
    .filter((line): line is TranscriptLine => Boolean(line));
}

export function formatTranscriptPlainText(lines: TranscriptLine[]) {
  return lines
    .map((line) => {
      const time = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(line.at));
      return `[${time}] ${line.speaker}: ${line.text}`;
    })
    .join("\n");
}

export function canSaveTranscript(meeting: {
  hostLeftAt: string | null;
  transcriptSavedAt: string | null;
}) {
  return Boolean(meeting.hostLeftAt && !meeting.transcriptSavedAt);
}

export function executiveTranscriptFileName(organization: string, startsAt: string) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(startsAt));
  const safeOrg = organization.replace(/[<>:"/\\|?*]+/g, "").trim() || "Client";
  return `Executive Call Notes — ${safeOrg} — ${date}.docx`;
}
