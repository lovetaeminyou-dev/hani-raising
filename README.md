# 하니 키우기 1차 버전

스크린샷의 분위기를 참고해 만든 오리지널 하늘색 테마의 하니 키우기 스타터입니다.

## 포함된 기능
- 로그인 / 처음 시작
- 닉네임 + 4~6자리 PIN
- 하니 생성
- 포인트 / 레벨
- 체력 / 포만감 / 몸집
- 일하기 / 요리하기 / 쉬기 / 낚시
- 오늘의 하니력 미션 UI
- 소식 UI
- 모바일 반응형 하늘색 UI
- Cloudflare Workers + D1 기반 서버 구조
- PIN PBKDF2 해시 및 HttpOnly 세션 쿠키

## GitHub → Cloudflare 배포

### 1. GitHub
이 폴더 전체를 새 GitHub repository에 업로드합니다.

### 2. Cloudflare D1 만들기
Cloudflare Dashboard 또는 Wrangler로 D1 데이터베이스를 만듭니다.

예:
```bash
npx wrangler d1 create hani-db
```

출력된 database_id를 `wrangler.jsonc`의
`REPLACE_WITH_YOUR_D1_DATABASE_ID` 자리에 넣습니다.

### 3. 테이블 만들기
처음에는:
```bash
npx wrangler d1 execute hani-db --remote --file=./schema.sql
```

### 4. 배포
```bash
npm install
npx wrangler deploy
```

GitHub를 Cloudflare Workers에 연결하면 이후 GitHub push 때 자동 배포하도록 설정할 수 있습니다.

## 다음 개발 단계

1. 게임 탭
   - 홀짝
   - 사과게임
   - 지뢰찾기
   - 블록게임
   - 싱글 테트리스

2. 실시간 게임방
   - 오목
   - 테트리스대전
   - 사천성대전
   - 하니도쿠

3. 영토전
   - 6x6 영토판
   - 시즌 / 6시간
   - 점령 / 방어 / 황금영토

4. 관계·병
   - 찌르기
   - 교미 신청
   - 커플 D+
   - 방 만들기

5. 랭킹 / 기록 / 알림

주의: 실제 서비스에서는 로그인 rate limit, CSRF 방어, 만료 세션 정리, 게임별 서버 검증 등을 추가하는 것을 권장합니다.
