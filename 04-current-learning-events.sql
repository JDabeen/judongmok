-- Run once in the existing Judongmok Supabase project. Safe to rerun.
-- No existing records, users, policies or tables are removed.
begin;
create table if not exists public.jm_learning_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null,
  course text not null check (course in ('basic','intermediate','diary')),
  event_type text not null check (event_type in ('start','answer','activity_done','complete','feedback','convert_ok','convert_failed','saved')),
  lesson_day integer check (lesson_day between 1 and 11),
  activity integer check (activity between 1 and 8),
  question integer check (question between 1 and 20),
  correct boolean,
  rating text check (rating in ('easy','good','hard')),
  comment text check (char_length(comment) <= 200),
  has_audio boolean,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  check (course <> 'basic' or lesson_day is not null),
  check (event_type = 'feedback' or (rating is null and comment is null)),
  check (event_type <> 'feedback' or course = 'basic'),
  check (event_type <> 'answer' or (correct is not null and activity is not null and question is not null)),
  check (has_audio is null or (course = 'diary' and event_type = 'saved'))
);
alter table public.jm_learning_events enable row level security;
revoke all on public.jm_learning_events from public, anon, authenticated;
grant select, insert on public.jm_learning_events to authenticated;
drop policy if exists jm_event_insert_own on public.jm_learning_events;
create policy jm_event_insert_own on public.jm_learning_events for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists jm_event_read_own_or_admin on public.jm_learning_events;
create policy jm_event_read_own_or_admin on public.jm_learning_events for select to authenticated
using ((select auth.uid()) = user_id or exists (
  select 1 from public.admin_members a where a.user_id=(select auth.uid())
));
create index if not exists jm_event_time_idx on public.jm_learning_events(received_at desc);
create index if not exists jm_event_type_course_idx on public.jm_learning_events(event_type,course);
create index if not exists jm_event_user_attempt_idx on public.jm_learning_events(user_id,attempt_id);
commit;
select '주동목 새 학습 기록 테이블 준비 완료' as result;
