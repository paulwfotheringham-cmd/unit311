import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvFile(path) {
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

const envPath = process.argv[2] ?? join(process.cwd(), ".env.deploy.tmp");
const env = loadEnvFile(envPath);
const supabaseUrl = env.SUPABASE_URL?.trim();
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in", envPath);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function listChannels() {
  const { data, error } = await supabase.from("internal_message_channels").select("*");
  if (error) throw error;
  return data ?? [];
}

async function deleteChannelRow(channel) {
  await supabase.from("internal_messages").delete().eq("room", channel.room);
  await supabase.from("internal_scheduled_calls").delete().eq("room", channel.room);
  await supabase.from("internal_message_read_state").delete().eq("room", channel.room);
  const { error } = await supabase.from("internal_message_channels").delete().eq("id", channel.id);
  if (error) throw error;
}

const legacyOperatorIds = ["user-bcndrone", "user-1", "user-2", "user-3", "user-4", "user-5"];

const { error: deleteOperatorsError } = await supabase
  .from("internal_operators")
  .delete()
  .in("id", legacyOperatorIds);
if (deleteOperatorsError) throw deleteOperatorsError;

const channels = await listChannels();
const channelsToDelete = channels.filter(
  (channel) =>
    channel.name === "Nick" ||
    (channel.channel_type === "client" && channel.name !== "Test Channel"),
);

for (const channel of channelsToDelete) {
  console.log("Deleting channel:", channel.name);
  await deleteChannelRow(channel);
}

const { data: activeOperators, error: operatorsError } = await supabase
  .from("internal_operators")
  .select("id")
  .eq("status", "Active")
  .order("full_name", { ascending: true });
if (operatorsError) throw operatorsError;

const memberIds = (activeOperators ?? []).map((row) => row.id);
console.log("Active operator IDs:", memberIds.join(", "));

const remaining = channels.filter((channel) => !channelsToDelete.some((entry) => entry.id === channel.id));
for (const channel of remaining) {
  if (channel.channel_type !== "internal") continue;
  if (channel.room === "internal-ops") continue;
  const { error } = await supabase
    .from("internal_message_channels")
    .update({ member_operator_ids: memberIds })
    .eq("id", channel.id);
  if (error) throw error;
  console.log("Updated members for:", channel.name);
}

console.log("Messaging cleanup complete.");
