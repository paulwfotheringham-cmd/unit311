-- Save-only conversation listing for Executive Assistant.
-- Chats remain private drafts until the user presses Save Chat (is_saved = true).

alter table public.executive_assistant_conversations
  add column if not exists is_saved boolean not null default false;

create index if not exists executive_assistant_conversations_user_saved_updated_idx
  on public.executive_assistant_conversations (user_id, is_saved, updated_at desc);
