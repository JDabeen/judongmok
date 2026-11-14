-- 주동목 관리자 기기 알림 구독 저장용
-- 기존 learning_records / feedback / practice_sessions는 변경하지 않습니다.
-- Supabase SQL Editor에서 한 번 실행하세요.

create table if not exists public.admin_push_subscriptions (
  subscription_id text primary key
    check (char_length(subscription_id) between 20 and 128),
  user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists admin_push_subscriptions_user_idx
on public.admin_push_subscriptions (user_id);

alter table public.admin_push_subscriptions enable row level security;
revoke all on public.admin_push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.admin_push_subscriptions to authenticated;

drop policy if exists "admin_push_read_own" on public.admin_push_subscriptions;
create policy "admin_push_read_own"
on public.admin_push_subscriptions for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (select 1 from public.admin_members a where a.user_id = (select auth.uid()))
);

drop policy if exists "admin_push_insert_own" on public.admin_push_subscriptions;
create policy "admin_push_insert_own"
on public.admin_push_subscriptions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.admin_members a where a.user_id = (select auth.uid()))
);

drop policy if exists "admin_push_update_own" on public.admin_push_subscriptions;
create policy "admin_push_update_own"
on public.admin_push_subscriptions for update to authenticated
using (
  user_id = (select auth.uid())
  and exists (select 1 from public.admin_members a where a.user_id = (select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.admin_members a where a.user_id = (select auth.uid()))
);

drop policy if exists "admin_push_delete_own" on public.admin_push_subscriptions;
create policy "admin_push_delete_own"
on public.admin_push_subscriptions for delete to authenticated
using (
  user_id = (select auth.uid())
  and exists (select 1 from public.admin_members a where a.user_id = (select auth.uid()))
);

select '관리자 알림 구독 테이블 준비 완료' as result;
