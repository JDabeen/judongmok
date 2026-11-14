# 주동목 (Judongmok)

주어·동사부터 영어 문장을 만드는 7일 학습 웹앱입니다.

## 구조
- `index.html`: 학습 화면
- `admin/index.html`: 관리자 화면 (Supabase 인증 필요)
- `privacy.html`: 학습 기록 안내
- Supabase: 사용자별 학습 기록, 연습 시도, 피드백
- Netlify: 정적 웹앱 배포

## 배포
이 저장소의 기본 브랜치에 커밋하면 연결된 Netlify 프로젝트에서 자동 배포를 시도합니다. 배포 상태는 Netlify의 Deploys 탭에서 확인합니다.

## 보안
데이터베이스 비밀번호, Supabase secret/service role 키, Telegram 봇 토큰 등은 소스코드에 추가하지 않습니다.
