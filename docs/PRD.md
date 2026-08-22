# 제품 요구사항 정의서 (PRD): AcrossFlare

## 1. 개요 및 디자인 컨셉
* **제품명:** AcrossFlare (acrossflare.com)
* **디자인 정체성:** Vercel/Stripe 스타일의 미니멀 고대비 다크 테크 SaaS (딥 차콜 `#090A0F` + 네온 에메랄드 `#10B981`)
* **지원 언어:** 한국어(`ko`), 중국어(`zh`), 일본어(`ja`), 영어(`en`) - URL 라우팅 기반 (`/[locale]`)

---

## 2. 기술 스택
* **프론트엔드:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Shadcn UI, Lucide Icons
* **다국어:** `next-intl`
* **백엔드/DB:** Next.js API Routes, Prisma ORM, PostgreSQL
* **인프라:** Cloudflare (Proxy/SSL/WAF), Docker Compose, Nginx, 3x-ui (Xray API), Nextcloud API
* **결제:** PortOne (신용카드) + Stripe/Paymentwall (알리페이)

---

## 3. 핵심 기능 명세

### F-1. 사용자 서비스 분리
* **타겟 A (글로벌 우회/백업):** Nextcloud 10GB 자동 생성 + 카링(Karing) 연동 VLESS-WS/gRPC 1초 QR 및 딥링크 발급 (`Content-Type: text/yaml`). 밴드웨곤(150GB) 소진 시 랙너드(무제한) 자동 예비 전환.
* **타겟 B (마케팅 IP):** 별도 앱 설치 없는 HTTP/SOCKS5 프록시 URL(`http://id:pw@ip:port`) 및 WireGuard 설정 정보 제공. 대시보드 내 Mutex Lock 기반 1클릭 IP 변경(Rotate) 지원.

### F-2. 이원화 결제 및 자동 프로비저닝
* 언어 설정이 `zh`일 경우 알리페이(Alipay)를 기본 결제 탭으로 자동 분기 및 CNY/USD 통화 자동 변환.
* 결제 성공 웹훅(`POST /api/v1/payments/webhook`) 수신 즉시 3x-ui 클라이언트 계정 및 Nextcloud 저장소(`OCS-APIRequest: true`) 자동 발급.

### F-3. 어드민 제어판 (`/admin`)
* **상품별 탭 완전 격리:** [글로벌 우회 관리] 탭과 [마케팅 IP 관리] 탭 분리.
* **동적 요금제 빌더:** 어드민 GUI에서 요금제 신규 생성/수정/삭제 (가격 월 OO원/$OO 설정, 트래픽 한도, 백업 용량, 노드 조합 바인딩).
* **수동 고객 등록 (Manual Provisioning):** 회원가입/PG 결제 없이 어드민에서 고객 이메일/만료일 직접 입력 ➔ 3x-ui/Nextcloud 계정 즉시 발급 및 QR/프록시 URL 원클릭 복사.
* **유저 요금제/노드 동적 변경:** 유저 상세 페이지에서 요금제 변경 시 3x-ui 기존 계정 파기 ➔ 신규 노드 계정 생성 ➔ DB 업데이트 원클릭 통합 처리.
* **동적 노드 관리:** 3x-ui API 접속 정보(IP, Port, Creds)를 통한 VPS 노드 추가/삭제 및 1클릭 전체 유저 노드 이관.

### F-4. 보안 및 예비 시스템
* Cloudflare `CF-Connecting-IP` 헤더 기반 Nginx L7 프록시 단에서 Nextcloud 백업 UI 접속은 오직 VPN 사설 IP(`10.8.0.0/24`)로만 허용.
* 노드 차단 대비를 위해 모든 3x-ui 노드는 서브도메인(DDNS)으로 매핑하여 IP 변경 시 고객 설정 유지.