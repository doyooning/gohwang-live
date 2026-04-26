# Gohwang Live

축구 경기 운영자 기록 화면과 시청자 라이브 화면을 제공하는 웹 애플리케이션입니다.  
운영자가 경기 이벤트를 기록하면 시청자는 타임라인, 스코어, 경기 상태를 빠르게 확인할 수 있습니다.

## 배포 주소

- Vercel(v0): https://v0-gohwanglive.vercel.app

## 주요 기능

### 1) 운영자 기능 (`/manager`)
- 경기 생성, 수정, 삭제
- 팀, 선수 관리
- 경기 라인업 등록 (선발/교체, 등번호 기준 정렬)
- 경기 상태 관리 (예정, LIVE, 종료)
- 대기화면 표시 토글(`display_status`) 제어

### 2) 경기 이벤트 기록 (`/manager/match/[id]`)
- 득점, 자책골, 경고/퇴장, 교체 기록
- 전반/후반/연장 시간 이벤트 기록
- 승부차기 성공/실패 기록
- 타임라인 되돌리기(최근 이벤트 취소)
- 이벤트 시간 분리 구조
  - `sort_minute`: 정렬용 누적 시간
  - `display_minute`: 화면 표시 시간
  - `period`: 전반/후반/연장 구분

### 3) 라인업 상태 추적
- `match_lineup_players.player_status`
  - `available`, `sub_in`, `sub_out`, `sent_off`
- 교체/퇴장 이벤트에 따라 선수 상태 자동 반영
- 운영자/시청자 UI에서 상태 아이콘 표시

### 4) 시청자 기능 (`/match`, `/match/[id]`)
- 경기 목록/상세 조회
- 타임라인 최신순 정렬(내림차순)
- 경기 종료 시 PSO 스코어 표시(승부차기 기록이 있을 때만)
- 경기 상태, 스코어, 타임라인 변화 즉시 반영

## 흐름도

### 운영자 기록 흐름
1. 운영자가 `/manager`에서 경기 선택
2. 라인업 등록 후 경기 시작
3. 득점/카드/교체/시간/승부차기 이벤트 기록
4. 기록 즉시 타임라인 및 스코어 반영
5. 경기 종료 처리

### 시청자 조회 흐름
1. 시청자가 `/match`에서 경기 목록 확인
2. 경기 상세(`/match/[id]`) 진입
3. 라이브 상태/스코어/타임라인 확인
4. 운영자 기록 변경사항 실시간 반영

## 기술 스택

- Framework: Next.js 16 (App Router)
- Language: TypeScript, React 19
- UI: Tailwind CSS v4, Radix UI, Lucide
- Backend/BaaS: Supabase (Postgres, Auth)
- Realtime: SSE + Polling 혼합

## 프로젝트 구조 (핵심)

- `app/manager/*`: 운영자 페이지
- `app/match/*`: 시청자 페이지
- `app/api/match/[id]/stream/route.ts`: SSE 스트림 API
- `components/match/*`: 경기 목록/상세/타임라인/라인업 UI
- `lib/types.ts`: 공통 타입 정의

## 시작하기

### 1) 의존성 설치
```bash
npm install
```

### 2) 환경 변수 설정 (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 3) 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속
