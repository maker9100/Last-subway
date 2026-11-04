# 자체 검증 결과

검증일: 2026-11-04 KST. Node.js 20.19.5에서 실행했다. 자동 테스트 17개가 통과했다. 다음 내용은 실제 확인한 범위와 남은 수동 확인을 구분한다.

1. [x] **import 경로·확장자·순환 참조**: 36개 JS 파일의 실제 상대 import 86개를 대조해 누락과 순환 참조 0개를 확인했다. `vite.config.js`는 `@shared`를 실제 shared 디렉터리로 해석한다. 이름을 지정한 import의 미사용 항목도 0개다.
2. [x] **의존성/API**: `package.json`과 lockfile에서 Express 4.22.1, ws 8.22.1, Three.js 0.174.0, Vite 6.4.5를 고정했다. `createGameServer()`의 Express/WS API는 통합 테스트로, `World`와 `Avatar`의 Three.js 모델·재질·행렬 API는 생성/갱신 테스트로, Vite는 실제 빌드로 검사했다. `WebGLRenderer`의 GPU 생성은 아래 환경 제한이 있다. `npm audit` 결과 알려진 취약점은 0개였다. qs는 6.16.1로 고정 override했다.
3. [x] **설치→빌드→기동**: NODE_ENV=production에서 `npm ci`, `npm run build`, `npm start`가 성공했다. `server/index.js`는 import.meta.url을 기준으로 프로젝트 dist를 찾는다. 별도 프로세스로 실제 npm start를 실행해 `/healthz` 200 `ok`, `/`와 `/travel/route` 200 HTML, 빌드 JS 200, 없는 JS 404와 `/ws` 접속을 확인했다. `.npmrc`의 include=dev로 production 빌드에서도 Vite가 설치된다.
4. [x] **시간표 수계산·테스트**: `trainState()`에서 00:00:00은 e=0·0번 구간·문 열림, 00:07:30은 e=450초·1번 구간·초원역, 00:59:59는 e=3599초·7번 구간·중앙 도착 1초 전, 01:00:00은 e=0으로 wrap한다. 23:55 운행은 다음 날 00:00에 e=300초로 중앙→초원 주행 중이고 00:02:30에 초원에 도착한다. `tests/schedule.test.js`가 이 값과 정차 종료 60초 경계를 확인한다. UTC·서울·뉴욕·호놀룰루 자식 프로세스의 출력도 일치했다.
5. [x] **입력·XSS·오류 격리**: `cleanNickname()`, `validClient()`, `filterChat()`에서 빈 값·과대 값·타입 오류와 금지 문자를 검사한다. 실제 WS 테스트에서 악성 HTML 문자열을 채팅 데이터로 보내도 서버가 유지됐고, `UI.chat()`은 textContent와 createTextNode만 사용해 화면에 넣는다. 반복 불량 JSON 연결은 종료되며 다른 연결과 healthz는 정상이다. `RateLimiter`, maxPayload 4096, IP 연결 수, 하트비트와 try/catch 경로를 코드에서 추적했다.
6. [x] **룸 상태**: `RoomManager.join()`은 await 없는 구간에서 이전 멤버십 제거→대상 Map 복원/등록→플레이어 룸 지정→통지를 수행한다. 같은 룸으로 재입장해도 유일 멤버십을 유지한다. `refreshJourney()`는 한 바퀴 뒤 ID+12 이동과 잠수함 도착을 처리한다. 실제 WS에서 발권 전 탑승 거부, 문 닫힘 시각 탑승·하차 거부, 운행 ID 갱신, 객실 접속 종료·복구, 잠수함 종료 중 끊김·복구를 검사했고 활성 플레이어가 정확히 한 룸에 있음을 매번 단언했다. 24명 채널 분할과 복제 탭 세션도 검사했다.
7. [x] **리소스·리스너 수명**: `disposeTree()`가 geometry/material/texture를 Set으로 모아 해제한다. `World.dispose()`, `Environment.configure()/dispose()`, `Avatar.dispose()`는 룸·계절·아바타 변경 시 이를 사용한다. `tests/world.test.js`에서 모든 역, 객실, 잠수함과 기념일의 자원 dispose 이벤트가 빠짐없이 발생했다. `Controls`는 단일 AbortController, `Network.dispose()`는 타이머·visibility 리스너 정리, main.js의 pagehide는 프레임·오디오·UI 입력 정리 경로를 가진다. Canvas 대역을 사용한 이 테스트는 실제 GPU 메모리 측정을 대신하지 않는다.
8. [ ] **Pointer Lock·채팅 실제 조작**: `Controls.update()/setBlocked()`와 main.js `keydown()`을 추적해 Esc 해제·입력창·모달·포커스 상실 중 이동 차단과 키 초기화를 확인했다. 데스크톱 Pointer Lock, 모바일 멀티터치, 실제 3D 조작 체험은 실행 환경의 WebGL 비활성화 때문에 수동 검증하지 못했다.
9. [x] **달력 경계**: `seasonAt()`, `lunarEvent()`, `calendarAt()`과 테스트에서 2/28→3/1, 11/30→12/1, 12/31→1/1, 2028년 윤일, 할로윈 10/28~11/3, 크리스마스 종료를 검사했다. 2026~2040년 Intl 음력 정월 초하루를 찾아 전날 음력 12월 말일과 다음날 모두 설 연휴임을 검사했다. 2026 폴백은 ICU 미지원 대역에서도 검사했다. 검증하지 않은 2027~2040년 양력 폴백은 추가하지 않았다.
10. [x] **Render 연결 준비**: `listen()`은 PORT를 읽어 0.0.0.0에 바인딩하고 `Network.connect()`는 HTTPS에서 wss를 선택한다. `createGameServer()`의 trust proxy=1과 upgrade의 오른쪽 X-Forwarded-For 한 홉 처리가 일치한다. `render.yaml`에 요구한 빌드·시작·헬스체크·NODE_VERSION이 있다. 실제 Render 계정에 서비스를 생성하거나 공개 배포하지는 않았다.

## 실제 실행 결과

```text
Node v20.19.5
npm ci: 성공 (NODE_ENV=production)
npm run build: 성공 (Vite 6.4.5)
npm start: 성공 (0.0.0.0, PORT 환경변수)
/healthz: 200, ok
/: 200, HTML
/travel/route: 200, SPA HTML
/assets/missing.js: 404
빌드된 JavaScript: 200
/ws: 실제 hello/welcome 성공
node --test: 17 passed, 0 failed
npm audit: 0 vulnerabilities
```

## 브라우저 확인의 한계

Chromium에서 시작 화면과 UI 문구를 확인했다. WebGLRenderer 생성은 브라우저가 `GL_VENDOR = Disabled, GL_RENDERER = Disabled`를 반환해 실패했다. 따라서 3D 화면이 렌더링됐다고 주장하지 않으며, 60fps·Pointer Lock·모바일 체감 조작도 측정하지 않았다. 실제 GPU가 있는 사용자 환경에서 README의 배포 후 체크리스트를 수행해야 한다.

## 단순화한 부분

- TV는 생성 자막 방송, 책은 세 장의 창작 여행 메모와 소품으로 구현했다.
- 망원경은 FOV 확대, 그네·해먹·썰매는 자세와 카메라 연출이다. 물리 기반 운동이나 경사 충돌을 사용하지 않는다.
- 파도·불은 저폴리 기하 변화, 자연음·열차음·종은 합성음이다. 파티클은 작은 포인트로 표현한다.
- 눈사람·발자국·이모션의 임시 효과는 유효 시간과 개수 상한이 있다. 늦게 접속한 플레이어에게 과거 효과를 복원하지 않는다.
- 열차 외부는 단순 로우폴리 차량, 객실은 한 공간으로 표현한다. 중앙 복귀 시 운행 ID를 바꿔 같은 편성의 순환을 유지한다.
- 2027~2040년의 검증되지 않은 음력 양력 날짜는 Intl에 의존한다. 해당 ICU가 없으면 그 연도의 음력 행사는 생략된다.

## 사용자가 할 일

1. 압축을 풀고 last-train 폴더에서 GitHub 저장소에 푸시한다. package-lock.json과 .npmrc를 포함한다.
2. Render Web Service를 연결하고 README의 설정을 적용한다.
3. 실제 GPU 브라우저와 휴대전화에서 위 수동 확인 항목을 점검한다.

참고한 1차 자료:
- 한국천문연구원 2026년 월력요항: https://www.kasi.re.kr/kor/post/newsMaterial/32031
- Render 무료 서비스: https://render.com/docs/free
- Express 프록시 설정: https://expressjs.com/en/guide/behind-proxies/
- ws 프로젝트 공식 문서: https://github.com/websockets/ws/blob/master/doc/ws.md
