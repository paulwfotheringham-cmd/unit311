import Link from "next/link";
import { Video } from "lucide-react";

import MessagingCallRoom from "@/components/messaging/MessagingCallRoom";
import { getMessagingCallRoom } from "@/lib/messaging-call-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type MeetVideoPageProps = {
  params: Promise<{ sessionId: string }>;
};

function FounderVideoStub({ sessionId }: { sessionId: string }) {
  return (
    <section className="flex min-h-screen items-center justify-center bg-[#020617] px-5 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#07111f] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-200">
            <Video className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
              Unit311 Central
            </p>
            <h1 className="text-xl font-semibold text-white">Founder video session</h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-white/65">
          This is your private Unit311 Central video room for a scheduled founder session. Join at your
          booked time using the same link from your confirmation email.
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center">
          <p className="text-sm font-medium text-white/80">Session ID: {sessionId}</p>
          <p className="mt-2 text-xs text-white/45">
            Live video for Messaging calls opens from a Messaging Join call link. Founder booking video
            bridges continue through the booked session flow.
          </p>
          <button
            type="button"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#2563eb] px-5 text-sm font-semibold text-white"
          >
            Join session
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          Need help? Email{" "}
          <a href="mailto:info@unit311central.com" className="text-sky-300 hover:underline">
            info@unit311central.com
          </a>
          {" · "}
          <Link href="/book" className="text-sky-300 hover:underline">
            Book another session
          </Link>
        </p>
      </div>
    </section>
  );
}

export default async function MeetVideoPage({ params }: MeetVideoPageProps) {
  const { sessionId } = await params;

  if (isSupabaseConfigured()) {
    try {
      const room = await getMessagingCallRoom(sessionId);
      if (room && !room.endedAt && room.callType === "video") {
        return <MessagingCallRoom sessionId={room.sessionId} expectedMode="video" />;
      }
    } catch {
      // Fall through to founder stub for non-messaging / unknown session IDs.
    }
  }

  return <FounderVideoStub sessionId={sessionId} />;
}
