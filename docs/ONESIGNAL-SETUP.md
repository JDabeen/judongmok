# 주동목 관리자 알림 — OneSignal Web Push

이 코드는 **준비 단계**입니다. 아래 설정 전에는 실제 푸시 알림을 보내지 않습니다.

## 구조

`public.feedback`에 새 행 INSERT → Supabase Database Webhook → `notify-feedback-onesignal` Edge Function → OneSignal → 관리자 휴대폰 알림.

기본 규칙: 글로 작성한 의견 또는 `hard` 평가가 들어오면 알립니다. `easy`·`good` 평가만 있는 경우 알림을 생략합니다. 푸시 본문에는 학습자의 ID나 의견 전문을 노출하지 않습니다.

## A. OneSignal 프로젝트 만들기 (계정 소유자가 수행)

1. https://onesignal.com 에 로그인
2. 새 앱 이름을 `주동목 관리자 알림`으로 생성
3. Web Push를 선택하고 **Custom Code** 방식 설정
4. Site URL: `https://splendorous-mochi-346e26.netlify.app`
5. Service worker 설정: Path `/push/onesignal/`, Filename `OneSignalSDKWorker.js`, Scope `/push/onesignal/`
6. 자동 권한 팝업은 사용하지 않음 (관리자 페이지의 버튼으로 요청)
7. 설정 후 **OneSignal App ID (UUID)** 를 확인

앱 ID는 공개 정보이고, 계정 소유자가 요청하면 개발자가 `admin/push-config.js`에 입력할 수 있습니다. **REST API Key는 비밀이므로 GitHub/채팅에 절대 넣지 않습니다.**

## B. Supabase 테이블 만들기

Supabase → SQL Editor → 새 쿼리에서 `03-admin-push.sql` 실행. 기존 학습 데이터는 보존합니다. `admin_push_subscriptions`에는 관리자 계정의 기기별 OneSignal 구독 ID가 저장되고, 일반 사용자에게는 접근 권한이 없습니다.

## C. 서버 함수 배포

Supabase → Edge Functions → Deploy a new function → Via Editor

- Function Name: `notify-feedback-onesignal`
- Source: `supabase/functions/notify-feedback-onesignal/index.ts`
- Verify JWT: **OFF** (데이터베이스 웹훅이 JWT 없이 호출하는 대신 별도 `x-webhook-token` 비밀 헤더 검증)
- 서버 Secrets 설정:
  - `ONESIGNAL_APP_ID`: UUID
  - `ONESIGNAL_REST_API_KEY`: OneSignal REST API의 **비밀키**
  - `FEEDBACK_WEBHOOK_TOKEN`: 24자 이상의 임의 비밀 문자열
- `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`는 Supabase의 서버용 기본 환경에서 제공하는 값 사용

**주의:** Netlify 자동 배포는 Supabase Edge Functions까지 배포해 주지 않습니다. 별도 배포가 필요합니다.

## D. Database Webhook

Supabase → Integrations → Database Webhooks → Create:

- Name: `notify_admin_on_feedback_insert`
- Schema / Table: `public.feedback`
- Event: **INSERT** 만
- Type: Edge Function
- Function: `notify-feedback-onesignal`
- Headers에 `x-webhook-token` = `FEEDBACK_WEBHOOK_TOKEN`과 같은 값

비밀 헤더를 등록하지 않으면 함수가 401 응답을 반환하도록 설계되어 있습니다.

## E. 관리자 휴대폰 설정

1. 휴대폰의 지원 브라우저에서 `https://splendorous-mochi-346e26.netlify.app/admin/` 열기
2. 관리자 로그인
3. **이 기기에서 알림 켜기** 누르고 브라우저의 알림 허용
4. 알림 상태가 `이 기기의 알림이 켜졌습니다`인지 확인
5. `admin_push_subscriptions`에 행이 생성됐는지 확인

Android Chrome은 일반 브라우저에서도 가능. iPhone은 iOS 16.4 이상에서 홈 화면에 추가한 웹앱이어야 웹 푸시 수신이 가능합니다.

## F. 테스트

- 실제 학습 앱에서 **글로 된 의견** 또는 **어려워요** 평가 제출
- 관리자의 휴대폰에 알림이 와야 합니다
- 알림 누르면 `/admin/` 페이지로 이동하며 로그인 필요할 수 있습니다
- 단순 `쉬웠어요` 평가는 푸시를 보내지 않도록 설계했습니다

## 한계 / 보안

- 첫 운영 전 앱 ID, REST 키, 서버 함수, 웹훅 연결과 실제 휴대폰 테스트가 필요합니다.
- 공개 GitHub에는 API 비밀키·Supabase 관리자 키·봇 토큰·사용자 데이터가 들어가면 안 됩니다.
- 초기 버전은 관리자가 알림을 켠 기기별로 구독 ID를 저장합니다. 관리자 권한이 취소되면 수신 대상에서도 제외됩니다.
- 향후 운영자 페이지에서 기기 알림 해제와 구독 정리를 더 편하게 만드는 기능을 추가할 수 있습니다.
- 개발 중이므로 초기 푸시는 **중요 피드백**만, 일간 학습 요약은 아직 포함하지 않습니다.
