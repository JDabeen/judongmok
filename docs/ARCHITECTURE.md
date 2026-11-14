# 주동목 시스템 구조 (2026-11-14)

## 학습자 흐름

1. 학습자는 Netlify에서 호스팅되는 웹앱에 접속한다. 회원가입은 필요하지 않다.
2. 하루에 be동사 1문장과 일반동사 1문장, 총 7일 분량을 연습한다.
3. 브라우저 localStorage는 진도와 서버 전송 대기열을 보관한다. Supabase Auth는 익명 세션을 발급한다.
4. Supabase PostgreSQL에 practice_sessions(연습 시도/진행/완료), learning_records(문장 완료/오답), feedback(평가/선택 의견)을 기록한다.
5. 네트워크에 문제가 생기면 데이터를 브라우저 대기열에 두었다가 다음 온라인 접속에서 재전송을 시도한다.
6. 관리자는 별도 로그인과 admin_members 권한 검사 및 RLS를 거쳐 전체 집계 및 최근 기록을 조회한다.

## 중요 피드백 알림 흐름

feedback 신규 INSERT → Supabase Database Webhook → notify-feedback-onesignal Edge Function → OneSignal REST API → 등록된 관리자 휴대폰의 Chrome 웹 푸시.

- 초기 사용자 테스트 동안 쉬웠어요(easy)·적당해요(good)·어려웠어요(hard) 등 모든 난이도 피드백 INSERT에 푸시를 보낸다.
- 평가만 보내고 의견을 작성하지 않아도 푸시 대상이다.
- 학습자 식별자 및 원문 의견은 잠금화면 푸시 본문에 싣지 않는다.
- 알림을 클릭하면 관리자 페이지로 이동하며, 로그아웃 상태라면 재로그인이 필요할 수 있다.
- 관리자 로그아웃은 이미 등록된 브라우저 알림 구독을 해지하지 않는다.

## 운영 및 보안

| 구성 | 역할 |
| --- | --- |
| HTML, CSS, JavaScript | 학습 UI와 관리자 UI |
| Netlify | 정적 웹사이트 호스팅 |
| GitHub | 버전 관리 및 Netlify 자동 배포 연계 |
| Supabase Auth | 익명 학습자와 관리자 세션 |
| Supabase PostgreSQL + RLS | 기록 저장과 접근 권한 제어 |
| Supabase Edge Function | 중요한 의견 선정과 푸시 요청 |
| OneSignal | 관리자 기기로 웹 푸시 발송 |
| PWA manifest / sw.js | 홈 화면 실행 및 정적 자원 캐싱 |

- GitHub에는 publishable client key만 포함한다. REST 비밀키, service role key, 웹훅 토큰을 저장하거나 공유하지 않는다.
- Edge Function은 Netlify 자동 배포 대상이 아니며 별도 배포가 필요하다.
- 웹훅은 서버의 x-webhook-token 검증을 거친다.
- 전체 초기화 버튼은 기기 로컬 진도 초기화이며, 이미 업로드된 서버 기록은 삭제하지 않는다.
- 단순 방문자 수, 재방문율, 정확한 이탈률이 자동 측정된다고 주장하지 않는다.

## 검증 상태

2026-11-14에 관리자 테스트 피드백 → Database Webhook → Edge Function → OneSignal → Android Chrome 알림 → 관리자 화면 이동의 실제 동작을 확인했다. 이것은 단일 기기 end-to-end 기능 테스트다. 외부 학습자 사용성과 학습 효과는 아직 검증되지 않았다.

관련 문서: [개발 진행 기록](./BUILD-LOG.md) · [알림 설정](./ONESIGNAL-SETUP.md)
