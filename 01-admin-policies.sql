-- 주동목 운영자 대시보드 권한 설정 (v0.8)
-- 먼저 이 SQL을 실행하세요. 기존 학습 데이터는 지우지 않습니다.

create table if not exists public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.admin_members enable row level security;
revoke all on public.admin_members from anon, authenticated;
grant select on public.admin_members to authenticated;

drop policy if exists "admin_members_read_self" on public.admin_members;
create policy "admin_members_read_self"
  on public.admin_members for select to authenticated
  using ((select auth.uid())=user_id);

-- 기존 학습 기록의 '본인 기록 열람' 규칙은 그대로 둡니다.
-- admin_members에 수동으로 등록된 관리자만 전체 기록을 읽을 수 있습니다.
drop policy if exists "admin_read_learning_records" on public.learning_records;
create policy "admin_read_learning_records"
  on public.learning_records for select to authenticated
  using (exists (select 1 from public.admin_members a where a.user_id=(select auth.uid())));

drop policy if exists "admin_read_practice_sessions" on public.practice_sessions;
create policy "admin_read_practice_sessions"
  on public.practice_sessions for select to authenticated
  using (exists (select 1 from public.admin_members a where a.user_id=(select auth.uid())));

drop policy if exists "admin_read_feedback" on public.feedback;
create policy "admin_read_feedback"
  on public.feedback for select to authenticated
  using (exists (select 1 from public.admin_members a where a.user_id=(select auth.uid())));

select '관리자 조회 권한 정책 준비 완료' as result;
