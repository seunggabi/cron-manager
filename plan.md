# Cron Manager - GUI 기반 Cron 작업 관리 도구

## 프로젝트 개요
cron 작업 관리의 반복적이고 번거로운 작업들을 GUI로 해결하는 도구

## 핵심 문제점
- 환경변수 설정이 번거로움
- 작동시간 cron 문법이 복잡함
- 주석 관리가 어려움
- 실행시간 정렬이 불편함
- 테스트 실행(1분 뒤 등)이 반복적이고 귀찮음
- 로그 파일 관리가 분산되어 있음
- 로그 확인이 번거로움

## 핵심 기능

### 1. Cron 작업 관리
- ✅ 작업 목록 조회 (현재 사용자 crontab)
- ✅ 작업 추가/수정/삭제
- ✅ 작업 활성화/비활성화 (주석 처리)
- ✅ 작업 정렬 (실행시간 기준)
- ✅ 작업 복제

### 2. 스케줄 설정
- ✅ GUI 기반 스케줄 빌더
  - 분/시/일/월/요일 선택기
  - 프리셋 (매시간, 매일, 매주, 매월 등)
  - cron 표현식 실시간 미리보기
  - 다음 실행 시간 표시 (n회)
- ✅ 자연어 입력 지원 ("매일 오전 9시", "10분마다" 등)

### 3. 환경변수 관리
- ✅ 작업별 환경변수 설정
- ✅ 전역 환경변수 설정
- ✅ .env 파일 import/export
- ✅ 환경변수 템플릿 (PATH, NODE_ENV 등)

### 4. 테스트 실행
- ✅ 즉시 실행 (테스트 모드)
- ✅ n분 뒤 실행 예약
- ✅ 드라이런 모드 (실제 실행 없이 로그만)
- ✅ 실행 결과 실시간 표시

### 5. 로그 관리
- ✅ 작업별 로그 파일 자동 설정
- ✅ 로그 파일 경로 커스터마이징
- ✅ 로그 뷰어 (클릭 한번으로 열기)
- ✅ 로그 검색/필터링
- ✅ 로그 로테이션 설정
- ✅ stdout/stderr 분리 옵션

### 6. Sync & Backup
- ✅ crontab 백업/복원
- ✅ 버전 관리 (변경 이력)
- ✅ 다른 서버로 sync
- ✅ Git 연동 (optional)

### 7. 추가 편의 기능
- ✅ 작업 검색/필터링
- ✅ 태그/카테고리 관리
- ✅ 작업 실행 히스토리
- ✅ 실행 실패 알림 (이메일/Slack/Discord 등)
- ✅ 작업 의존성 관리 (A 작업 후 B 작업 실행)
- ✅ 다크모드/라이트모드
- ✅ 다국어 지원 (한국어/영어)

## 기술 스택

### Frontend
- **Framework**: React + TypeScript
- **UI Library**:
  - shadcn/ui (Tailwind CSS 기반 컴포넌트)
  - Radix UI (headless components)
- **상태 관리**: Zustand or Jotai
- **폼 관리**: React Hook Form + Zod
- **날짜/시간**: date-fns
- **Cron 파싱**: croner (cron-parser 대체, 더 현대적)
- **스타일링**: Tailwind CSS
- **아이콘**: Lucide React
- **코드 에디터**: Monaco Editor (환경변수, 스크립트 편집용)

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express or Fastify
- **Cron 관리**: node-cron (실행용), croner (파싱용)
- **프로세스 관리**: node-pty (터미널 에뮬레이션)
- **파일 시스템**: fs-extra
- **로그 관리**: winston or pino
- **인증**: JWT (필요시)

### Desktop App (Optional)
- **Electron**: 데스크톱 앱으로 패키징
- **Tauri**: (더 가벼운 대안)

### 개발 도구
- **번들러**: Vite
- **린터**: ESLint + Prettier
- **테스트**: Vitest + Testing Library
- **타입 체킹**: TypeScript strict mode

## 아키텍처

```
cron-manager/
├── frontend/           # React 앱
│   ├── src/
│   │   ├── components/  # UI 컴포넌트
│   │   ├── pages/       # 페이지
│   │   ├── hooks/       # 커스텀 훅
│   │   ├── stores/      # 상태 관리
│   │   ├── utils/       # 유틸리티
│   │   └── types/       # TypeScript 타입
│   └── package.json
├── backend/            # Node.js API
│   ├── src/
│   │   ├── routes/      # API 라우트
│   │   ├── services/    # 비즈니스 로직
│   │   ├── utils/       # 유틸리티
│   │   └── types/       # TypeScript 타입
│   └── package.json
├── shared/             # 공유 타입/유틸
├── docs/               # 문서
└── package.json        # Monorepo root
```

## 데이터 모델

### CronJob
```typescript
interface CronJob {
  id: string;
  name: string;
  description?: string;
  schedule: string;  // cron 표현식
  command: string;
  enabled: boolean;
  env?: Record<string, string>;  // 환경변수
  logFile?: string;  // 로그 파일 경로
  logStderr?: string;  // stderr 로그 (optional)
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  nextRun?: Date;
  runCount?: number;
  failCount?: number;
}
```

### LogEntry
```typescript
interface LogEntry {
  id: string;
  jobId: string;
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  duration?: number;  // ms
}
```

### Config
```typescript
interface Config {
  globalEnv?: Record<string, string>;
  logDir?: string;  // 기본 로그 디렉토리
  logRotation?: {
    enabled: boolean;
    maxSize: string;  // '10M'
    maxFiles: number;
  };
  notifications?: {
    email?: EmailConfig;
    slack?: SlackConfig;
    discord?: DiscordConfig;
  };
  backup?: {
    enabled: boolean;
    schedule: string;
    maxBackups: number;
  };
}
```

## API 엔드포인트

### Cron Jobs
- `GET /api/jobs` - 작업 목록
- `GET /api/jobs/:id` - 작업 상세
- `POST /api/jobs` - 작업 추가
- `PUT /api/jobs/:id` - 작업 수정
- `DELETE /api/jobs/:id` - 작업 삭제
- `POST /api/jobs/:id/toggle` - 활성화/비활성화
- `POST /api/jobs/:id/run` - 즉시 실행
- `POST /api/jobs/:id/test` - 테스트 실행
- `POST /api/jobs/sync` - crontab과 동기화

### Logs
- `GET /api/logs` - 로그 목록 (필터링 지원)
- `GET /api/logs/:jobId` - 특정 작업 로그
- `GET /api/logs/:jobId/:logId` - 로그 상세
- `DELETE /api/logs/:jobId` - 로그 삭제

### Schedule
- `POST /api/schedule/parse` - cron 표현식 파싱
- `POST /api/schedule/next-runs` - 다음 실행 시간 계산
- `POST /api/schedule/from-natural` - 자연어 → cron 변환

### Config
- `GET /api/config` - 설정 조회
- `PUT /api/config` - 설정 수정

### Backup
- `GET /api/backup` - 백업 목록
- `POST /api/backup/create` - 백업 생성
- `POST /api/backup/:id/restore` - 백업 복원

## 개발 단계

### Phase 1: 기본 구조 (Week 1)
- [x] 프로젝트 셋업 (monorepo)
- [ ] 기본 UI 레이아웃
- [ ] Backend API 기본 구조
- [ ] Crontab 읽기/쓰기 기능
- [ ] 작업 목록 CRUD

### Phase 2: 핵심 기능 (Week 2)
- [ ] 스케줄 빌더 GUI
- [ ] 환경변수 관리
- [ ] 로그 뷰어
- [ ] 즉시 실행/테스트 기능

### Phase 3: 고급 기능 (Week 3)
- [ ] 로그 검색/필터링
- [ ] 백업/복원
- [ ] 실행 히스토리
- [ ] 알림 기능

### Phase 4: 최적화 & 배포 (Week 4)
- [ ] 성능 최적화
- [ ] 테스트 작성
- [ ] 문서 작성
- [ ] Docker 이미지
- [ ] (Optional) Electron 패키징

## 보안 고려사항
- [ ] crontab 파일 권한 체크
- [ ] 명령 인젝션 방지
- [ ] 환경변수 암호화 (민감 정보)
- [ ] 로그 파일 권한 관리
- [ ] API 인증/인가 (multi-user 환경)

## 테스트 계획
- [ ] 단위 테스트 (utils, services)
- [ ] 통합 테스트 (API endpoints)
- [ ] E2E 테스트 (주요 워크플로우)
- [ ] Cron 파싱 테스트
- [ ] 실제 crontab 연동 테스트

## 문서화
- [ ] README.md
- [ ] API 문서
- [ ] 사용자 가이드
- [ ] 개발자 가이드
- [ ] 배포 가이드

## 향후 확장 가능성
- 다중 사용자 지원
- 원격 서버 관리 (SSH)
- Systemd timer 지원
- Kubernetes CronJob 연동
- 작업 템플릿 마켓플레이스
- 모바일 앱
- 클라우드 백업

## 비즈니스 전략 & 수익화

### 타겟 시장
1. **개발자/DevOps 엔지니어**
   - cron 작업 관리가 번거로운 개발자
   - 여러 서버를 관리하는 DevOps 팀
   - 프리랜서/개인 개발자

2. **중소기업/스타트업**
   - 전담 DevOps 없이 자동화 필요
   - 비용 효율적인 스케줄링 솔루션

3. **관리형 서비스 제공업체**
   - 고객 서버 관리 대행
   - MSP (Managed Service Provider)

### 수익 모델

#### 1. Freemium 모델 (추천)
**무료 버전:**
- 로컬 사용 (단일 사용자)
- 최대 10개 cron 작업
- 기본 로그 뷰어
- 커뮤니티 지원

**Pro 버전: $9/월 or $79/년**
- 무제한 cron 작업
- 원격 서버 관리 (SSH)
- 고급 로그 분석
- 백업 클라우드 저장
- 알림 기능 (Slack, Discord, Email)
- 우선 지원

**Team 버전: $29/월 or $249/년**
- Pro 기능 전체
- 팀 협업 (최대 5명)
- 역할 기반 접근 제어
- 감사 로그
- SSO 지원
- 전용 지원 채널

**Enterprise: 문의 기반**
- 온프레미스 배포
- 커스터마이징
- SLA 보장
- 전담 계정 매니저

#### 2. 라이선스 판매
- **개인 라이선스**: $49 (평생, 단일 머신)
- **개발자 라이선스**: $149 (평생, 최대 3대)
- **회사 라이선스**: $499 (평생, 무제한)

#### 3. 마켓플레이스 판매
**전략:**
- VS Code Extension Marketplace
- JetBrains Plugin Marketplace
- Mac App Store ($9.99)
- Microsoft Store ($9.99)
- Setapp (구독형 앱 스토어)

**수수료 고려:**
- Apple/Microsoft: 30% (첫해), 15% (2년차부터)
- VS Code Marketplace: 무료 (오픈소스) or 자체 결제
- Setapp: 수익 분배 방식

#### 4. 추가 수익원
- **템플릿/플러그인 마켓플레이스**
  - 사용자가 작업 템플릿 판매
  - 플랫폼 수수료 20%

- **프리미엄 템플릿 팩**: $19
  - 데이터베이스 백업 템플릿
  - 모니터링 템플릿
  - 배포 자동화 템플릿

- **교육/컨설팅**
  - 기업 교육 프로그램
  - DevOps 자동화 컨설팅

### 마케팅 전략

#### 1. 콘텐츠 마케팅
- **기술 블로그**
  - "Cron 작업 베스트 프랙티스"
  - "DevOps 자동화 가이드"
  - "시스템 관리자를 위한 도구"

- **YouTube**
  - 데모 영상
  - 튜토리얼
  - 케이스 스터디

- **오픈소스 전략**
  - 코어 기능 오픈소스 (무료)
  - 고급 기능 상용화
  - GitHub 스타 모으기

#### 2. 커뮤니티 구축
- Discord/Slack 커뮤니티
- Reddit (r/devops, r/sysadmin)
- Hacker News 런칭
- Product Hunt 등록

#### 3. 파트너십
- 호스팅 업체 제휴
- DevOps 도구 번들
- 교육 기관 협력

#### 4. SEO & ASO
- "cron manager", "crontab gui" 키워드 최적화
- App Store 최적화
- 백링크 구축

### 경쟁사 분석

**기존 솔루션:**
1. **Cronitor** (크론 모니터링)
   - 강점: 모니터링/알림 특화
   - 약점: GUI 관리 부족
   - 가격: $10/월~

2. **Crontab UI** (오픈소스)
   - 강점: 무료
   - 약점: 기능 제한적, UI 구식

3. **Linux 기본 도구** (crontab -e)
   - 강점: 기본 제공
   - 약점: CLI only, 불편

**우리의 차별점:**
- ✅ 직관적인 현대적 UI
- ✅ 통합 로그 관리
- ✅ 테스트/디버깅 기능
- ✅ 환경변수 관리
- ✅ 원격 서버 지원
- ✅ 한국어 지원

### 출시 로드맵

**Phase 1: MVP (2개월)**
- 로컬 버전 완성
- 무료 오픈소스로 공개
- 커뮤니티 피드백 수집

**Phase 2: 베타 (1개월)**
- Pro 기능 개발
- 얼리 액세스 프로그램 ($4.99/월)
- 100명 베타 테스터 모집

**Phase 3: 정식 출시 (2주)**
- Product Hunt 런칭
- Hacker News 포스팅
- 마켓플레이스 등록
- 프레스 릴리스

**Phase 4: 확장 (6개월)**
- Enterprise 기능
- 파트너십 구축
- 다국어 확장

### 예상 수익 (보수적 시나리오)

**6개월 후:**
- 무료 사용자: 1,000명
- Pro 유료 전환율: 3% → 30명
- 수익: 30 × $9 = **$270/월**

**12개월 후:**
- 무료 사용자: 5,000명
- Pro: 150명 ($9/월)
- Team: 10팀 ($29/월)
- 라이선스 판매: 20개 ($49)
- 수익: **$2,420/월 + $980 (일회성)**

**24개월 후 (낙관적):**
- 무료 사용자: 20,000명
- Pro: 600명
- Team: 50팀
- Enterprise: 5개 ($500/월)
- 수익: **$9,350/월**

### 법적 고려사항
- [ ] 회사 설립 (개인사업자 vs 법인)
- [ ] 오픈소스 라이선스 선택 (MIT, GPL, dual-license)
- [ ] 이용약관/개인정보처리방침
- [ ] 결제 시스템 (Stripe, Paddle)
- [ ] 세금 처리 (부가세, 소득세)
- [ ] 상표 등록 고려

### 리스크 & 대응

**리스크:**
1. 시장 수요 부족
   - 대응: MVP 빠른 검증, 피드백 반영

2. 경쟁사 진입
   - 대응: 빠른 기능 개발, 커뮤니티 구축

3. 기술 부채
   - 대응: 초기부터 테스트/문서화

4. 수익화 실패
   - 대응: 여러 수익 모델 테스트

### 성공 지표 (KPI)

**사용자 지표:**
- 일간 활성 사용자 (DAU)
- 월간 활성 사용자 (MAU)
- 사용자 유지율 (Retention)
- 순추천지수 (NPS)

**비즈니스 지표:**
- 월간 반복 수익 (MRR)
- 고객 획득 비용 (CAC)
- 고객 생애 가치 (LTV)
- LTV/CAC 비율 (목표: 3:1)
- 전환율 (무료→유료)

**제품 지표:**
- 관리되는 cron 작업 수
- 평균 작업 실행 성공률
- 로그 조회 수
- 기능별 사용률

### 추천 전략

**초기 (0-6개월):**
1. 오픈소스로 공개 → GitHub 스타 모으기
2. Product Hunt 런칭
3. Reddit/HN에서 피드백 수집
4. 무료 버전으로 사용자 확보

**성장기 (6-18개월):**
1. Pro 기능 출시
2. 마켓플레이스 진출 (VS Code, Mac App Store)
3. 콘텐츠 마케팅 강화
4. 파트너십 구축

**확장기 (18개월+):**
1. Enterprise 기능
2. 국제 시장 진출
3. 팀 확장
4. M&A 또는 자체 성장

## 참고 자료
- Cron 문법: https://crontab.guru/
- croner: https://github.com/Hexagon/croner
- node-cron: https://github.com/node-cron/node-cron
- shadcn/ui: https://ui.shadcn.com/
- Product Hunt: https://www.producthunt.com/
- Indie Hackers: https://www.indiehackers.com/
- Stripe Atlas: https://stripe.com/atlas (회사 설립)
