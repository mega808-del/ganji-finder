# 사주 역산 (四柱 逆算)

사주팔자(년주·월주·일주·시주)의 **간지를 입력하면, 그 사주가 성립하는 실제 양력/음력 생년월일시를 역산**해 주는 모바일 PWA.

- 스택: React 18 + TypeScript + Vite + Tailwind CSS + vite-plugin-pwa
- 범위: 1900 ~ 2030년, KST(UTC+9) 고정
- 특징: 24절기(입춘 세수·절입 월건)를 **태양 겉보기 황경으로 직접 계산**, 음력은 한국천문연구원 기준 데이터 사용

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 타입체크 + 프로덕션 빌드 (dist/)
npm run preview  # 빌드 결과 확인 (Service Worker 동작)
npm run icons    # public/icons PNG 재생성
npm run validate # 1900~2030 절기·사주·음력을 manseryeok과 대조 (개발용)
npm run gen:vsop # VSOP87D 지구 황경 계수 테이블 재생성
```

> **`node_modules`(의존성)와 `dist`(빌드 결과)는 저장소에 포함하지 않는다.** 새로 내려받은 폴더라면
> `npm install` 을 먼저 실행해야 한다. 지금 이 폴더에는 빌드된 `dist/` 가 남아 있으므로
> `사주 역산.exe` 를 더블클릭하면 Node.js 없이도 바로 실행된다.

### Windows 에서 실행

- **`사주 역산.exe` 더블클릭** — 브라우저가 열리고 트레이 아이콘으로 상주한다(종료는 트레이 아이콘 우클릭).
  `dist/` 가 없거나 소스가 더 최신이면 Node.js 로 자동 재빌드한다.
- **`start.cmd` 더블클릭** — `node_modules` 가 없으면 `npm install` 을 먼저 수행한 뒤 빌드·미리보기한다.

## 배포 (GitHub Pages)

빌드는 상대 경로(`base: './'`)로 만들어지므로 `https://<아이디>.github.io/<저장소>/` 같은 하위 경로에서도
자산·매니페스트·Service Worker 가 모두 동작한다. `.github/workflows/deploy.yml` 이 `main` 브랜치에
푸시될 때마다 빌드 후 Pages 로 배포한다.

이 폴더에는 이미 `main` 브랜치 최초 커밋이 만들어져 있으므로, 원격만 연결하면 바로 푸시할 수 있다.
저장소에 올라가는 것은 소스 **37개 파일 · 약 648KB** 이고, `node_modules`·`dist` 는 `.gitignore` 로 제외된다.

1. GitHub 에서 새 저장소를 만든다 (Public).
2. 이 폴더에서 저장소를 연결하고 푸시한다.

```bash
git remote -v                                    # 원격이 비어 있는지 확인 (아무것도 안 나오면 정상)
git remote add origin https://github.com/<아이디>/<저장소>.git
git push -u origin main
```

   - 이미 `origin` 이 잡혀 있다면 주소만 바꾼다: `git remote set-url origin <주소>`
   - 인증 오류가 나면 비밀번호 자리에 **Personal Access Token** 을 넣는다(2단계 인증 사용 시 필수).

3. 저장소 → **Settings → Pages → Build and deployment → Source** 를 `GitHub Actions` 로 선택한다.
4. **Actions** 탭의 `Deploy PWA to GitHub Pages` 가 끝나면 표시되는 주소를 공유한다.
   - 예: `https://<아이디>.github.io/<저장소>/`
5. 휴대폰에서 그 주소를 열고 우측 상단 **설치** 버튼(또는 브라우저 메뉴)으로 홈 화면에 추가한다.

### 이후 수정 사항 배포

```bash
git add -A
git commit -m "변경 내용"
git push
```

`main` 에 푸시할 때마다 Actions 가 다시 빌드·배포하며, 앱은 새로 접속할 때 자동으로 갱신된다.

> 저장소 루트(예: `<아이디>.github.io`)에 배포해도 상대 경로라 그대로 동작한다.

## 폴더 구조

```
.
├── 사주 역산.exe                # Windows 실행 런처 (dist/ 를 서빙, 트레이 상주)
├── start.cmd                   # Node.js 로 설치·빌드·미리보기
├── launcher/Launcher.cs        # 사주 역산.exe 소스
├── .github/workflows/deploy.yml # main 푸시 시 Pages 자동 배포
├── index.html                  # PWA 메타 태그, iOS 홈 화면 추가 설정
├── package.json
├── vite.config.ts              # React + VitePWA(Workbox) 설정
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── public/
│   ├── manifest.json           # 웹 앱 매니페스트 (standalone)
│   ├── favicon.svg
│   └── icons/                  # 192·512·maskable·apple-touch 아이콘
├── scripts/
│   ├── generate-icons.mjs      # SVG → PNG 아이콘 생성
│   ├── gen-vsop87.mjs          # 공식 VSOP87D 데이터 → 계수 테이블
│   └── validate.ts             # 계산 엔진 대조 검증(개발용)
└── src/
    ├── main.tsx                # 엔트리 + Service Worker 등록
    ├── App.tsx                 # 메인 화면 (범위·간지 입력·실행·결과)
    ├── index.css               # 다크 테마 + 3D 입체 버튼 스타일
    ├── components/
    │   ├── GanjiSheet.tsx      # 천간/지지 3D 키패드 바텀 시트
    │   └── ResultCard.tsx      # 양력·음력·윤달·시주 결과 카드
    └── lib/
        ├── ganji.ts            # 육십갑자 상수·변환 (오호둔, 시주 산식)
        ├── solar-terms.ts      # 24절기 절입 시각 (뉴턴 반복)
        ├── vsop87-earth.ts     # 공식 VSOP87D 지구 황경 계수 (자동 생성)
        ├── saju.ts             # 사주 계산 + 역산 검색 엔진
        └── lunar.ts            # 양력 → 한국 음력(평달/윤달)
```

## 계산 기준

| 항목 | 기준 |
| --- | --- |
| 시간대 | KST(UTC+9) 고정 (과거 서머타임·+8:30 표준시 미적용) |
| 세수(年柱) | 입춘 절입 시각에 변경 |
| 월건(月柱) | 입춘·경칩·청명·입하·망종·소서·입추·백로·한로·입동·대설·소한 12절 |
| 일주(日柱) | 자정(00:00) 경계, 1949-10-01 갑자일 기준 60일 순환 |
| 시주(時柱) | 2시간 단위 12시지, 자시 23:00~00:59 |
| 음력 | 한국천문연구원 음력 데이터, 평달/윤달 구분 |

절입 시각은 태양의 겉보기 황경이 15° 배수가 되는 순간을 VSOP87 축약식 + 장동 + 광행차로
계산하고 뉴턴 반복법으로 수렴시킨다(1900~2100년 오차 수 초~수십 초).
`scripts/validate.ts` 로 manseryeok(만세력 라이브러리) 결과와 1900~2030년 전 구간을 대조한다.

## PWA 설치

화면 우측 상단의 **설치** 버튼을 누르면 설치가 시작된다.

- **Android(갤럭시)**: Chrome 에서 접속 → `설치` 버튼 → `앱 설치` 확인
  (버튼이 안내를 띄우면 우측 상단 ⋮ → `앱 설치` / `홈 화면에 추가`)
- **iOS(아이폰·아이패드)**: Safari 에서 접속 → `설치` 버튼 → 안내에 따라 공유 → `홈 화면에 추가`
  (iOS 는 설치 프롬프트가 없어 안내 시트를 보여 준다)
- 이미 홈 화면 아이콘으로 실행 중이면(`standalone` 모드) 설치 버튼은 자동으로 숨겨진다.
- 설치 후에는 주소창 없는 앱 화면으로 실행되고, Service Worker 가 자산을 캐시해 **오프라인에서도 동작**한다.
