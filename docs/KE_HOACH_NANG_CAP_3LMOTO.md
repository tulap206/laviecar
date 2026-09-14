# Kế hoạch nâng cấp Laviecar từ lõi 3L Moto

**Nguồn tính năng/UI:** `tulap206/3lmotohue` (đang tốt hơn, đầy đủ hơn)  
**Đích sản xuất:** `tulap206/laviecar` (đang chạy thật)  
**Nguyên tắc:** overlay — mang tính năng 3L Moto vào Laviecar; **không** thay thế dữ liệu, logo, thương hiệu, nội dung marketing, hay phân hệ tài chính của Laviecar.

---

## 1. Kết luận: giải pháp tốt nhất

**Không copy nguyên repo 3lmotohue đè lên laviecar.** Hai app cùng fork Next.js + Supabase (xe / khách / đơn thuê / giao dịch / log), nhưng đã phân kỳ:

| Khối | 3L Moto | Laviecar | Quyết định |
|------|---------|----------|------------|
| Auth + API + middleware JWT | Có (~14 API) | Không (client + `USERS` cứng) | Port vào Lavie |
| Timeline đội xe, giao/nhận, gán xe nhanh, tóm tắt ngày, realtime đơn mới | Có | Không | Port, đổi copy/icon ô tô + accent tím |
| Telegram, khóa booking web, FindMy/AirTag | Có | Không | Tùy chọn sau; FindMy ưu tiên thấp |
| Trang chủ booking xe máy + theme xanh + BIDV/VietQR 3L | Có | Không | **Không port** |
| Hub chọn phân hệ, cho thuê ô tô, vay, cầm đồ | Không | Có (production) | **Giữ nguyên** |
| Brand `LAVIECAR_BUSINESS`, logo, purple, content Huế ô tô | Không | Có | **Giữ nguyên** |
| Project Supabase | Khác | Khác | **Không đổi URL/key** |

**Mô hình đích:** Laviecar = **brand + data + loan/pawn + homepage ô tô** + **lớp vận hành/auth/UI dashboard của 3L Moto** (đã skin Lavie).

Hai repo vẫn độc lập. Không gộp monorepo lúc này (rủi ro deploy/env lẫn project). Sau khi Lavie ổn định, mới xem xét package `rental-core` dùng chung — đó là bước sau, không phải bước 1.

---

## 2. Ranh giới đóng băng (không được đụng trừ khi có yêu cầu riêng)

### 2.1 Dữ liệu production

- Env `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` của **Laviecar** không bao giờ bị ghi đè bằng env 3L Moto.
- Không `TRUNCATE`, không `DROP`, không đổi tên cột đang dùng.
- Mọi SQL chỉ **additive**: `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, index mới.
- Field chưa có cột DB: tiếp tục gói `ghi_chu` / `notes` JSON như hiện tại; không tự tạo migration trừ khi đã xác nhận schema prod.
- Backup JSON đầy đủ (vehicles, customers, rentals, transactions, access_logs, pawn_*, loan_*) **trước mỗi đợt SQL và mỗi lần deploy production**.

### 2.2 Thương hiệu & nội dung

Giữ nguyên (chỉnh sửa tối thiểu, không thay bằng bản 3L):

- `lib/business-info.ts` (`LAVIECAR_BUSINESS`)
- `app/page.tsx`, `app/page-client.tsx` (landing ô tô Huế, CTA đối tác 3L Moto **giữ**)
- `app/layout.tsx` metadata, favicon
- `app/login/page.tsx` copy + `/logo.jpg`
- `app/globals.css` token tím, `lib/module-theme.ts` accent purple
- Ảnh public: `logo.jpg`, `hue-car-bg.jpg`, sedan/SUV/VinFast
- In ấn: `components/dashboard/print-business-blocks.tsx` dùng brand Lavie

### 2.3 Phân hệ chỉ có ở Laviecar

- `/dashboard/selection` — sau login **vẫn** vào đây (3L Moto vào thẳng `/dashboard`)
- `/dashboard/loan-management` + `loan-charts` / `loan-ui`
- `/dashboard/pawnshop` + CRUD `pawn_*` trong `lib/supabase.ts`
- Export pawn/loan trong `lib/supabase.ts` **không được mất** khi merge helper từ 3L

---

## 3. Gap đã xác nhận (rút gọn)

### 3.1 Port từ 3L Moto (ưu tiên)

1. Auth server: `lib/auth-jwt.ts`, `auth-crypto.ts`, `auth-guard.ts`, `/api/auth/*`, `/api/client-ip`
2. `middleware.ts` bảo vệ `/dashboard` bằng cookie JWT (đổi tên cookie thành `laviecar_session`)
3. Dashboard ops: fleet timeline, lịch giao nhận hôm nay, gán xe nhanh, daily summary/notification, `NewOrderRealtimeNotifier`
4. Layout dashboard tách server/client như 3L, **giữ bypass** `/dashboard/selection`
5. Báo cáo A4, dialog tài khoản, about phần mềm — skin `SOFTWARE_ABOUT` cho Lavie (tác giả có thể giữ, **tên sản phẩm** = Laviecar)
6. Header bảo mật `next.config.mjs` (CSP chỉnh cho domain/analytics/ảnh Lavie)
7. SEO `robots.ts` / `sitemap.ts` với host laviecar
8. Dọn copy sót: session `3l_moto_*`, chữ “Xe máy Quy79” trên in đơn thuê, tiêu đề health-check

### 3.2 Không port (hoặc phase muộn)

- Toàn bộ homepage 3L (booking xe máy, QR BIDV, theme xanh)
- `QUY79_BUSINESS`, secret mặc định chứa `3lmotohue`
- FindMy sync / AirTag — chỉ khi đội xe ô tô thật sự dùng
- Cron backup + Telegram — sau khi auth/dashboard ổn

### 3.3 Nợ kỹ thuật Laviecar (dọn cùng Phase 0)

| Đường dẫn | Ghi chú |
|-----------|---------|
| `components/components/` | Duplicate UI/sidebar |
| `lib/lib/` | supabase/utils cũ |
| `contexts/contexts/` | auth cũ |
| `app/dashboard/page-old.tsx`, `vehicles/page-old.tsx` | Chết |
| `customers/page-new.tsx`, `orders/page-new.tsx` | Chết |
| Pawnshop không nằm trên hub selection | Nên gắn lại card phân hệ |

---

## 4. Rủi ro nếu làm sai (và cách chặn)

| Rủi ro | Hậu quả | Chặn |
|--------|---------|------|
| Copy `lib/supabase.ts` 3L đè Lavie | Mất API cầm đồ / vay | Merge tay: giữ block pawn/loan, chỉ thêm helper rental |
| Copy `page-client.tsx` | Mất landing ô tô đang chạy | File trong freeze list |
| Middleware JWT khi chưa có API login | Khóa toàn bộ dashboard | Feature flag: middleware chỉ bật sau khi `/api/auth/login` + `/me` pass trên staging |
| Ghi cột `rentalTerm`, `discount`, `received_at` khi prod chưa có | Lỗi schema, lưu thất bại | Code fallback notes như 3L đã làm; SQL additive sau khi `information_schema` xác nhận |
| Location-sync ghi đè `vehicles.notes` | Mất ghi chú vận hành | Không bật FindMy cho đến khi có parser tag an toàn |
| Đổi cookie/localStorage tên | User bị logout | Chấp nhận có kế hoạch; migrate đọc cả key cũ 1–2 sprint |
| CSP copy nguyên 3L | Vỡ font/ảnh/analytics | Review header trên preview URL |
| SQL `rental-term-migration` `regexp_replace` notes | Có thể sửa notes đơn cũ | Chạy trên bản sao DB trước; backup JSON |

---

## 5. Chiến lược triển khai (overlay theo phase)

Mỗi phase = 1 PR riêng, preview Vercel trên **cùng Supabase Lavie (read-only verify)** hoặc clone staging. Production chỉ merge khi checklist phase đó xanh.

### Phase 0 — An toàn & dọn repo (thấp rủi ro dữ liệu)

**Mục tiêu:** Repo sạch, freeze list ghi rõ trong PR.

- Xóa duplicate/dead files (không đổi runtime path đang import).
- Sửa copy sót Quy79 / 3L trong dashboard in ấn (không đụng landing đối tác 3L).
- Inventory schema: script `health-check` liệt kê cột thật của `vehicles`, `customers`, `rentals`, `auth_users`, pawn, loan.
- Backup: xuất JSON toàn bộ bảng nghiệp vụ.

**Done khi:** `npm run build` pass; không đổi hành vi user; không SQL.

### Phase 1 — Auth production-grade (rủi ro khóa đăng nhập — làm trên preview trước)

**Mục tiêu:** Bỏ mật khẩu plaintext trên client và mảng `USERS` cứng.

1. Port API auth + crypto/JWT; cookie `laviecar_session`; secret `INTERNAL_API_SECRET` **mới**, không copy secret 3L.
2. SQL additive từ `3lmotohue/supabase/migrations/supabase-auth.sql` và `access-logs-ip-migration.sql` — **chỉ** trên project Lavie, sau backup.
3. Hash mật khẩu hiện có trong `auth_users` (script migrate 3L đã có pattern plaintext → salt/hash).
4. `AuthProvider` gọi `/api/auth/login|logout|me`; login xong **redirect `/dashboard/selection`**.
5. Middleware JWT: triển khai sau khi login preview ổn; giai đoạn song song có thể đọc cookie **hoặc** chưa bật matcher dashboard.
6. Đổi mật khẩu qua API (bỏ cập nhật local `USERS`).

**Không xóa** tài khoản prod. Không reset password hàng loạt trừ khi user xác nhận.

**Done khi:** Admin/staff Lavie đăng nhập được trên preview; session sống sau F5; logout xóa cookie; user không có trong code.

### Phase 2 — Overlay UI vận hành cho thuê (giữ purple + Car)

**Mục tiêu:** Dashboard cho thuê sát 3L về khả năng, nhìn Lavie.

Port từng khối, **không** thay file page một phát:

1. `lib/vehicle-timeline.ts` + `fleet-timeline-view.tsx` → gắn trang xe/đơn.
2. `today-handover-schedule.tsx`, `quick-assign-vehicle-popover.tsx`.
3. Daily summary / daily notification + realtime notifier trong `layout-client` (selection vẫn bypass sidebar).
4. Nâng `orders` / `vehicles` / `dashboard` / `customers` bằng diff có chủ đích (3L dài hơn ~1k–1.5k dòng/file): merge chức năng, giữ icon `Car`, copy ô tô, accent tím.
5. `lib/supabase.ts`: thêm fallback `rentalTerm` / display name **cộng** giữ pawn/loan.

SQL tùy chọn (chỉ khi health-check thiếu cột): `rentalTerm`, `discount`, `received_at`, `completed_at`. Vehicle `category` không bắt buộc (Lavie là ô tô).

**Done khi:** CRUD thuê trên preview ghi đúng project Lavie; loan/pawn không regress; UI timeline/handover dùng được.

### Phase 3 — Hub đa phân hệ & polish brand-safe

- Card **Cầm đồ** trên `/dashboard/selection` (hiện orphan URL).
- `SOFTWARE_ABOUT` Laviecar; dialog about / user accounts / báo cáo A4 dùng `LAVIECAR_BUSINESS`.
- Security headers + sitemap/robots domain Lavie.
- Dọn session key `3l_moto_*` sau khi đã migrate.

**Done khi:** Ba phân hệ vào được từ hub; in ấn hiện LAVIECAR; không còn “Quy79” trên luồng thuê.

### Phase 4 — Ops tùy chọn (quyết định sản phẩm)

Chỉ làm khi vận hành cần:

- Telegram + `/api/booking-notify` gắn **form landing Lavie hiện có** (không thay UI 3L).
- `booking-lock` nếu muốn tạm dừng nhận đơn web.
- `/api/backup` + Vercel cron + `CRON_SECRET`.
- FindMy/location: không mặc định.

---

## 6. Quy tắc merge code (bắt buộc khi port)

1. **Cherry-pick theo file/feature**, không `git merge` 3lmotohue vào laviecar (lịch sử/brand/SQL sẽ đè nhau).
2. Mỗi file port: tìm-thay `3L Moto` / `QUY79` / xanh-blue moto → Lavie / purple / ô tô.
3. Cookie/secret/User-Agent: prefix `laviecar`.
4. Không commit `.env` 3L; `.env.example` chỉ thêm biến mới với placeholder.
5. Không tạo cột DB từ TypeScript “cho tiện”.
6. Sau mỗi PR: `npm run build` + health-check; smoke login → selection → thuê → vay → cầm đồ.

---

## 7. Thứ tự PR đề xuất

| PR | Phase | Rủi ro prod | Ghi chú |
|----|-------|-------------|---------|
| 1 | 0 | Rất thấp | Cleanup + doc này |
| 2 | 1a | Trung bình | API auth, chưa bật middleware cứng |
| 3 | 1b | Cao | Middleware JWT + hash password |
| 4 | 2a | Trung bình | Timeline + handover (read-heavy) |
| 5 | 2b | Trung bình | Merge orders/vehicles/dashboard |
| 6 | 3 | Thấp–TB | Hub pawn, about, headers |
| 7 | 4 | TB | Telegram/backup khi có nhu cầu |

Không gộp PR 3 với PR 5.

---

## 8. Checklist go-live production (mỗi phase có SQL hoặc auth)

- [ ] Backup JSON + (nếu có) dump Supabase
- [ ] Preview URL trỏ **đúng** project Lavie (hoặc staging clone)
- [ ] Đếm record trước/sau: customers, vehicles, rentals, pawn_contracts, loan_agreements
- [ ] Login admin + 1 staff thật
- [ ] Tạo/sửa/xóa (soft) 1 đơn thuê test rồi xóa hoặc đánh cancelled
- [ ] Mở loan + pawn, xác nhận list cũ còn
- [ ] Landing public: logo, hotline, form, đối tác 3L
- [ ] Rollback: revert deploy Vercel về deployment trước; SQL additive thì cột mới để nguyên (an toàn)

---

## 9. Việc cố ý không làm trong đợt này

- Không trỏ Laviecar sang database 3L Moto
- Không thay landing bằng booking xe máy
- Không xóa phân hệ vay/cầm đồ để “giống 3L”
- Không hardcode user/password mới trong repo
- Không chạy FindMy hay cron backup trước khi auth ổn

---

## 10. Bước tiếp theo ngay sau khi chốt kế hoạch

1. Phase 0 trên nhánh riêng: xóa file chết + inventory schema.
2. Chuẩn bị secret Lavie (`INTERNAL_API_SECRET`) trên Vercel — không dùng giá trị 3L.
3. Phase 1 auth trên preview, user xác nhận đăng nhập thật rồi mới bật middleware.

Tài liệu này là nguồn sự thật cho các PR overlay. Mọi PR sau phải nêu: file lấy từ 3L, file freeze Lavie, SQL (nếu có), cách rollback.
