# 주동목 알림 연결 가이드

**현재 상태:** 함수 소스코드만 GitHub에 저장됨. Supabase Edge Function 배포, Telegram 봇 연결, 데이터베이스 웹훅 설정은 아직 하지 않음. 기존 학습 앱은 정상 운영 가능.

## 동작 원리

`public.feedback` 테이블에 새로운 행이 INSERT → Supabase Database Webhook → `notify-feedback` Edge Function → Telegram 메시지 → 휴대폰 알림.

알림 소음 방지를 위해 **'어려워요(hard)' 평가 또는 텍스트가 있는 의견**만 즉시 알립니다. 간단한 '쉬워요' 평가는 관리자 화면에만 저장합니다.

**개인정보:** 메시지에는 익명 사용자 ID, 이메일, 인증 토큰을 포함하지 않습니다. 의견 본문에는 사용자가 직접 민감정보를 적을 가능성이 있으므로 향후 개인정보 필터링 및 보관 정책 점검이 필요합니다.

## 1. Telegram 봇 만들기

1. Telegram 설치 및 로그인
2. Telegram에서 공식 인증된 **@BotFather** 검색
3. `/newbot`으로 봇 이름과 고유 사용자명 입력 (사용자명은 `bot`으로 끝나야 함)
4. 발급된 **Bot Token은 채팅이나 GitHub에 올리지 않기**
5. 생성된 봇 대화창에서 `/start` 보내기
6. 개인 대화의 Chat ID 확인 (설정할 때 필요; Chat ID 자체는 토큰과 다르나 공개하지 않는 편이 좋음)

## 2. Supabase Secrets 등록 (추후 진행)

Supabase → Edge Functions → Secrets에서 아래 3개를 설정:
- `TELEGRAM_BOT_TOKEN`: BotFather의 비밀 봇 토큰
- `TELEGRAM_CHAT_ID`: 알림 받을 1:1 Telegram 채팅 ID
- `FEEDBACK_WEBHOOK_TOKEN`: 최소 24자 이상의 무작위 비밀 문자열 (봇 토큰과 달라야 함)

어떤 값도 **GitHub 커밋이나 일반 채팅으로 공유하지 않습니다.**

## 3. Edge Function 배포 (추후 진행)

Supabase → Edge Functions → Deploy a new function → Via Editor
- 함수 이름: `notify-feedback`
- 코드: `supabase/functions/notify-feedback/index.ts`
- 외부 웹훅이 호출하므로 **Verify JWT를 OFF**로 설정
- 대신 함수 안에서 `x-webhook-token` 헤더를 검증함

이 함수 코드를 GitHub에 수정한다고 **Netlify에서 Supabase 함수가 자동 배포되지는 않습니다**. 별도 Edge Function 배포 단계가 필요합니다.

## 4. Database Webhook 설정 (추후 진행)

Supabase → Integrations → Database Webhooks → Create
- Name: `feedback_telegram_notification`
- Schema: `public`, Table: `feedback`
- Events: **INSERT**
- Type: Supabase Edge Function, Function: `notify-feedback`
- Headers: `x-webhook-token` = Secrets의 `FEEDBACK_WEBHOOK_TOKEN`과 동일한 값
- Payload: 기본 INSERT 이벤트 (schema/table/type/record)

**주의:** 웹훅 헤더 비밀은 웹훅 구성이나 DB 트리거 SQL에서 관리자에게 보일 수 있으므로 관리자 접근을 제한하고, 토큰 유출 시 변경합니다.

## 5. 테스트

학습 앱에서 글이 있는 피드백을 1건 제출합니다. 텔레그램 알림이 도착하면 성공입니다.
평가만 'easy'로 보내면 알림이 오지 않는 것이 정상입니다.
정상 접수인데 메시지가 안 오면 Supabase Edge Functions의 Invocations/Logs와 Database Webhook 실행 결과를 확인합니다.

## 앞으로

- 매일 요약 리포트는 별도 작업이며 현재 구현되지 않음
- 실제 사용자 유입 전 CAPTCHA, 과도한 익명 가입 방지, 개인정보 처리·삭제 절차 점검 필요
