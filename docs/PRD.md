# 제품 요구사항 정의서 (PRD): AcrossFlare

## 1. 개요 및 디자인 컨셉
* **제품명:** AcrossFlare (acrossflare.com)
* **디자인 정체성:** Vercel/Stripe 스타일의 미니멀 고대비 다크 테크 SaaS (딥 차콜 `#090A0F` + 네온 에메랄드 `#10B981`)
* **지원 언어:** 한국어(`ko`), 중국어(`zh`), 일본어(`ja`), 영어(`en`) - URL 라우팅 기반 (`/[locale]`)
* **리팩토링 목표:** Nextcloud(PHP / MySQL / Redis) 레이어를 제거하고, 1GB RAM VPS에서 **전체 컨테이너 RAM 300MB 미만**을 유지하는 초경량 백엔드로 전환한다. Swap 1GB를 구성해 피크 메모리를 흡수한다.

---

## 2. 기술 스택

### 프론트엔드 / 콘솔
* Next.js (App Router), TypeScript, Tailwind CSS, Shadcn UI, Lucide Icons
* `next-intl` 다국어
* PWA (`public/manifest.json` + Service Worker): 무설치 백업 대시보드

### 백엔드
* **Next.js API Routes + Prisma ORM + PostgreSQL** — 계정, 결제, 프로비저닝 상태
* **FastAPI (Python / Uvicorn)** — Karing 구독 API (`/api/v1/subscription`)

### 초경량 백업 백엔드 (Nextcloud 대체)
* **Vaultwarden (Docker / Rust):** 암호화 비밀번호, 카드 정보, 보안 메모. RAM ~40MB
* **Syncthing (Docker / Go):** 중앙 DB 없이 서버 OS 파일 시스템에 P2P 암호화 저장·동기화. RAM ~60MB
* **Caddy Reverse Proxy:** TLS 및 서브도메인 라우팅. RAM ~20MB

### 인프라
* Cloudflare (Proxy / SSL / WAF), Docker Compose, Caddy, 3x-ui (Xray API, 노드 VPS)
* **결제:** PortOne (신용카드) + Stripe/Paymentwall (알리페이)

### 리소스 타깃
| 컨테이너 | 예상 RAM |
|---|---|
| Vaultwarden | ~40MB |
| Syncthing | ~60MB |
| Caddy | ~20MB |
| FastAPI | ~40MB |
| Next.js web | ~80–120MB |
| PostgreSQL (tiny) | ~40–60MB |
| **합계** | **300MB 미만 목표** (+ Swap 1GB) |

제거된 스택: Nextcloud, PHP-FPM, MariaDB/MySQL(Nextcloud용), Redis.

---

## 3. 핵심 기능 명세

### F-1. 사용자 서비스 분리
* **타겟 A (글로벌 우회/백업):** Karing 연동 VLESS-REALITY(tcp·xtls-rprx-vision) 1초 QR 및 딥링크 발급 (`Content-Type: text/yaml`). 계정과 함께 Vaultwarden(보안 메모/암호) + Syncthing(파일 동기화) 백업 공간이 열린다. 밴드웨곤(150GB) 소진 시 랙너드(무제한) 자동 예비 전환.
* **타겟 B (마케팅 IP):** 별도 앱 설치 없는 HTTP/SOCKS5 프록시 URL(`http://id:pw@ip:port`) 및 WireGuard 설정 정보 제공. 대시보드 내 Mutex Lock 기반 1클릭 IP 변경(Rotate) 지원.

### F-2. 이원화 결제 및 자동 프로비저닝
* 언어 설정이 `zh`일 경우 알리페이(Alipay)를 기본 결제 탭으로 자동 분기 및 CNY/USD 통화 자동 변환.
* 결제 성공 웹훅(`POST /api/v1/payments/webhook`) 수신 즉시 3x-ui 클라이언트 계정 발급, Vaultwarden 초대, Syncthing 폴더 준비.

### F-3. 어드민 제어판 (`/admin`)
* **상품별 탭 완전 격리:** [글로벌 우회 관리] 탭과 [마케팅 IP 관리] 탭 분리.
* **동적 요금제 빌더:** 어드민 GUI에서 요금제 신규 생성/수정/삭제 (가격 월 OO원/$OO 설정, 트래픽 한도, 백업 용량, 노드 조합 바인딩). **운영 SSOT:** PostgreSQL `Plan` 테이블 — 서비스 페이지·결제·프로비저닝이 동일 값을 사용한다.
* **수동 고객 등록 (Manual Provisioning):** 회원가입/PG 결제 없이 어드민에서 고객 이메일/만료일 직접 입력 ➔ 3x-ui / Vaultwarden / Syncthing 즉시 발급 및 QR/프록시 URL 원클릭 복사.
* **유저 요금제/노드 동적 변경:** 유저 상세 페이지에서 요금제 변경 시 3x-ui 기존 계정 파기 ➔ 신규 노드 계정 생성 ➔ DB 업데이트 원클릭 통합 처리.
* **동적 노드 관리:** 3x-ui API 접속 정보(IP, Port, Creds)를 통한 VPS 노드 추가/삭제 및 1클릭 전체 유저 노드 이관.

### F-4. 보안 및 예비 시스템
* 오리진은 Caddy가 `acrossflare.com`(PWA/콘솔), `vault.acrossflare.com`(Vaultwarden), `sync.acrossflare.com`(Syncthing GUI)을 라우팅한다.
* 노드 차단 대비를 위해 모든 3x-ui 노드는 서브도메인(DDNS)으로 매핑하여 IP 변경 시 고객 설정 유지.

---

## 4. 사용자 UX 플로우 (글로벌)

1. 이메일 회원가입 ➔ 결제 또는 어드민 발급 ➔ **Karing VPN 구독 링크** 발급 (`/api/v1/subscription/{token}`).
2. Karing 앱 연결 ➔ 프로필 웹페이지 또는 구독 공지의 **[보안 백업 공간 바로가기]** (`https://acrossflare.com/dashboard`)를 탭.
3. 무설치 웹(PWA)에서 Vaultwarden(보안 메모/암호)과 Syncthing 기반 스토리지 백업을 이용.

Karing 구독 응답은 YAML 본문과 함께 아래 메타데이터/헤더를 포함한다.

* `profile-web-page-url` / `support-url` / `announce-url`: `https://acrossflare.com/dashboard`
* `announce`: `보안 백업 공간 바로가기 https://acrossflare.com/dashboard`
* YAML 상단 주석: `#profile-web-page-url` / `#support-url` / `#announce` (헤더가 빠질 때 대비)

---

## 5. 호스트 라우팅

| 호스트 | 대상 |
|---|---|
| `acrossflare.com` | Next.js PWA / 콘솔 / 결제 API. `/api/v1/subscription*` 는 FastAPI |
| `vault.acrossflare.com` | Vaultwarden (`:80`) |
| `sync.acrossflare.com` | Syncthing GUI (`:8384`) |
| `node-*.acrossflare.com` | 3x-ui 노드 (DNS only, 오리진 Compose에 포함하지 않음) |

---

## 6. 요금제·트래픽 (Phase 1)

마케팅 카드 ID는 `src/lib/plans.ts` + `src/lib/marketing-services.ts`에 고정되어 있고, **가격·트래픽·노드·백업 용량**은 Admin 제어판(`/admin/{standard|hybrid|workspace}/plans`)에서 PostgreSQL `Plan`으로 편집한다. `prisma db seed`는 카탈로그 기본값을 DB에 동기화한다.

| 서비스 | 플랜 ID | 트래픽 (표시) | 노드 |
|---|---|---|---|
| **Standard** | `global-week` | 20 GB (1주) | LA(B) |
| | `global-lite` | 100 GB (1개월) | LA(B) |
| | `global-year` | 100 GB/월 (DB 저장 1200 = 12×100) | LA(B) |
| **Hybrid** | `hybrid-week` | 20 GB (1주) | Tokyo + LA(A) |
| | `hybrid-lite` | **100 GB/인 (1개월)** | Tokyo + LA(A) |
| | `hybrid-year` | 100 GB/월 (DB 저장 1200) | Tokyo + LA(A) |
| **Workspace** | `workspace-a` | 100 GB | Tokyo + LA(A) |
| | `workspace-b` | 200 GB | Tokyo + LA(A) |
| | `workspace-c` | 1000 GB | Tokyo + LA(A) |

홈 히어로의 Hybrid 슬라이드는 카탈로그 ID `global-pro`(카피 전용)가 **`hybrid-lite` 요금·트래픽**을 표시한다. 연간 플랜의 Admin 트래픽 필드는 **12개월 합계**이며, UI는 `trafficGb ÷ 12`로 월간 표시한다.
