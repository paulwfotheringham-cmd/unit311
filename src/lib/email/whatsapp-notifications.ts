import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { fetchMailboxMessages } from "@/lib/email/imap";
import type { EmailMessage } from "@/lib/email/types";
import {
  formatClientChannelWhatsAppMessage,
  formatNewEmailWhatsAppMessage,
  getWhatsAppNotifyPhone,
  isWhatsAppConfigured,
  sendWhatsAppMessage,
} from "@/lib/email/whatsapp";
import type { ChatMessage } from "@/lib/internal-messaging-data";
import { getChannelByRoom } from "@/lib/internal-messaging-service";

type WhatsAppSettingsRow = {
  account_id: string;
  enabled: boolean;
  notify_phone: string;
  updated_at: string;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

export async function getWhatsAppNotificationStatus() {
  const configured = isWhatsAppConfigured();
  const phone = getWhatsAppNotifyPhone();

  if (!isSupabaseConfigured()) {
    return {
      configured,
      enabled: configured,
      phone,
      lastNotifiedAt: null as string | null,
    };
  }

  const supabase = requireSupabase();
  const [{ data: settings }, { data: lastLog }] = await Promise.all([
    supabase.from("email_whatsapp_settings").select("*").eq("account_id", "info").maybeSingle(),
    supabase
      .from("email_whatsapp_notification_log")
      .select("notified_at")
      .eq("account_id", "info")
      .order("notified_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const row = settings as WhatsAppSettingsRow | null;

  return {
    configured,
    enabled: configured && (row?.enabled ?? true),
    phone: row?.notify_phone ?? phone,
    lastNotifiedAt: (lastLog as { notified_at?: string } | null)?.notified_at ?? null,
  };
}

export async function setWhatsAppNotificationsEnabled(enabled: boolean) {
  const supabase = requireSupabase();
  const phone = getWhatsAppNotifyPhone();

  const { data, error } = await supabase
    .from("email_whatsapp_settings")
    .upsert(
      {
        account_id: "info",
        enabled,
        notify_phone: phone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as WhatsAppSettingsRow;
}

async function isWhatsAppEnabledForInfo() {
  if (!isWhatsAppConfigured()) return false;
  if (!isSupabaseConfigured()) return true;

  const supabase = requireSupabase();
  const { data } = await supabase
    .from("email_whatsapp_settings")
    .select("enabled")
    .eq("account_id", "info")
    .maybeSingle();

  return (data as { enabled?: boolean } | null)?.enabled ?? true;
}

async function wasMessageNotified(messageUid: number) {
  if (!isSupabaseConfigured()) return false;

  const supabase = requireSupabase();
  const { data } = await supabase
    .from("email_whatsapp_notification_log")
    .select("id")
    .eq("account_id", "info")
    .eq("message_uid", messageUid)
    .maybeSingle();

  return Boolean(data);
}

async function markMessageNotified(message: EmailMessage) {
  if (!isSupabaseConfigured()) return;

  const supabase = requireSupabase();
  const { error } = await supabase.from("email_whatsapp_notification_log").upsert(
    {
      account_id: "info",
      message_uid: message.uid,
      message_id: message.messageId,
      from_name: message.fromName,
      subject: message.subject,
      notified_at: new Date().toISOString(),
    },
    { onConflict: "account_id,message_uid" },
  );

  if (error) throw new Error(error.message);
}

const WESTPORT_MESSAGING_ACCOUNT_ID = "westport-messaging";

function hashStringToSafeInteger(value: string) {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash % 9007199254740991);
}

async function wasMessagingMessageNotified(messageId: string) {
  if (!isSupabaseConfigured()) return false;

  const supabase = requireSupabase();
  const { data } = await supabase
    .from("email_whatsapp_notification_log")
    .select("id")
    .eq("account_id", WESTPORT_MESSAGING_ACCOUNT_ID)
    .eq("message_id", messageId)
    .maybeSingle();

  return Boolean(data);
}

async function markMessagingMessageNotified(message: ChatMessage, channelName: string) {
  if (!isSupabaseConfigured()) return;

  const supabase = requireSupabase();
  const firstLine = message.content.trim().split(/\r?\n/)[0]?.trim() || "(No message)";
  const { error } = await supabase.from("email_whatsapp_notification_log").upsert(
    {
      account_id: WESTPORT_MESSAGING_ACCOUNT_ID,
      message_uid: hashStringToSafeInteger(message.id),
      message_id: message.id,
      from_name: channelName,
      subject: firstLine,
      notified_at: new Date().toISOString(),
    },
    { onConflict: "account_id,message_uid" },
  );

  if (error) throw new Error(error.message);
}

/** On first run, mark existing inbox messages as seen so old mail does not trigger alerts. */
async function bootstrapNotificationLog(messages: EmailMessage[]) {
  if (!isSupabaseConfigured()) return;

  const supabase = requireSupabase();
  const { count, error: countError } = await supabase
    .from("email_whatsapp_notification_log")
    .select("*", { count: "exact", head: true });

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) return;

  const inbound = messages.filter((message) => message.direction === "inbound");
  for (const message of inbound) {
    await markMessageNotified(message);
  }
}

export async function processInfoMailboxWhatsAppNotifications(
  prefetchedMessages?: EmailMessage[],
) {
  if (!(await isWhatsAppEnabledForInfo())) {
    return { sent: 0, skipped: "disabled" as const };
  }

  const messages = prefetchedMessages ?? (await fetchMailboxMessages("info"));
  await bootstrapNotificationLog(messages);

  const candidates = messages.filter((message) => message.direction === "inbound");

  let sent = 0;
  const results: Array<{ messageUid: number; subject: string; ok: boolean; error?: string }> = [];

  for (const message of candidates) {
    if (await wasMessageNotified(message.uid)) continue;

    try {
      await sendWhatsAppMessage(
        formatNewEmailWhatsAppMessage(message.fromName, message.subject),
      );
      await markMessageNotified(message);
      sent += 1;
      results.push({ messageUid: message.uid, subject: message.subject, ok: true });
    } catch (error) {
      results.push({
        messageUid: message.uid,
        subject: message.subject,
        ok: false,
        error: error instanceof Error ? error.message : "Notification failed.",
      });
    }
  }

  return { sent, skipped: null, results };
}

export async function sendWhatsAppTestNotification() {
  return sendWhatsAppMessage(
    formatNewEmailWhatsAppMessage("Unit311 Test", "WhatsApp alerts are working"),
  );
}

export async function notifyWestportClientMessageWhatsApp(message: ChatMessage) {
  if (!(await isWhatsAppEnabledForInfo())) {
    return { sent: false as const, skipped: "disabled" as const };
  }

  if (!message.operatorId.startsWith("client:")) {
    return { sent: false as const, skipped: "not_client" as const };
  }

  if (message.messageType === "system") {
    return { sent: false as const, skipped: "system" as const };
  }

  if (await wasMessagingMessageNotified(message.id)) {
    return { sent: false as const, skipped: "already_notified" as const };
  }

  const channel = await getChannelByRoom(message.room);
  if (!channel || channel.channelType !== "client") {
    return { sent: false as const, skipped: "not_client_channel" as const };
  }

  await sendWhatsAppMessage(
    formatClientChannelWhatsAppMessage(channel.name, message.createdAt, message.content),
  );
  await markMessagingMessageNotified(message, channel.name);

  return { sent: true as const, channelName: channel.name };
}
