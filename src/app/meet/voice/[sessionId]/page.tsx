import Link from "next/link";
import { Phone } from "lucide-react";

import MessagingCallRoom from "@/components/messaging/MessagingCallRoom";
import { createNoIndexMetadata } from "@/lib/metadata";
import { getMessagingCallRoom } from "@/lib/messaging-call-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = createNoIndexMetadata({
  title: "Voice meeting",
  description: "Private Unit311 Central voice meeting room.",
  path: "/meet/voice",
});

type MeetVoicePageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function MeetVoicePage({ params }: MeetVoicePageProps) {
  const { sessionId } = await params;

  if (isSupabaseConfigured()) {
    try {
      const room = await getMessagingCallRoom(sessionId);
      if (room && !room.endedAt && room.callType === "voice") {
        return <MessagingCallRoom sessionId={room.sessionId} expectedMode="voice" />;
      }
    } catch {
      // Fall through to not-found UI if lookup fails.
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-[#020617] px-5 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#07111f] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-200">
            <Phone className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
              Unit311 Central
            </p>
            <h1 className="text-xl font-semibold text-white">Voice call not found</h1>
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-white/65">
          This voice link is inactive or has ended. Start a new call from Messaging, then open the Join
          call link while signed in.
        </p>
        <p className="mt-6 text-center text-xs text-white/40">
          Session ID: {sessionId}
          {" · "}
          <Link href="/internaldashboard?view=messaging" className="text-sky-300 hover:underline">
            Open Messaging
          </Link>
        </p>
      </div>
    </section>
  );
}
