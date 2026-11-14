-- 관리자 계정을 만든 다음, 아래 이메일만 실제 관리자 이메일로 바꾸어 Run.
-- 반드시 본인이 만든 '이메일/비밀번호' 사용자 계정이어야 합니다.

insert into public.admin_members (user_id)
select id from auth.users
where lower(email) = lower('YOUR_ADMIN_EMAIL@example.com')
  and email_confirmed_at is not null
on conflict (user_id) do nothing;

-- 1명이 나오는지 확인
select a.user_id, u.email
from public.admin_members a
join auth.users u on u.id=a.user_id;
